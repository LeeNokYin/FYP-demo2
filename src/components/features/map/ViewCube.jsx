import { useCallback, useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import { useCameraControls } from '../../../hooks/useCameraControls'
import './ViewCube.css'

const FACE_ORIENTATION = {
	north: { heading: 0, pitch: 0 },
	east: { heading: 90, pitch: 0 },
	south: { heading: 180, pitch: 0 },
	west: { heading: 270, pitch: 0 },
	top: { heading: 0, pitch: -90 },
	bottom: { heading: 0, pitch: 89.9 }
}

const DIRECTIONS = [
	{ label: 'N', heading: 0, angle: 0 },
	{ label: 'NE', heading: 45, angle: 45 },
	{ label: 'E', heading: 90, angle: 90 },
	{ label: 'SE', heading: 135, angle: 135 },
	{ label: 'S', heading: 180, angle: 180 },
	{ label: 'SW', heading: 225, angle: 225 },
	{ label: 'W', heading: 270, angle: 270 },
	{ label: 'NW', heading: 315, angle: 315 }
]

const KEYBOARD_HEADING_STEP_DEG = 15
const KEYBOARD_PITCH_STEP_DEG = 8
const MAX_ABS_PITCH_DEG = 89
const DRAG_THRESHOLD_PX = 3
const NORTH_POLE_POSITION = Cesium.Cartesian3.fromDegrees(0, 90, 0)

const FACE_BUTTONS = [
	{ key: 'north', label: 'S', ariaLabel: 'Rotate to north face' },
	{ key: 'east', label: 'E', ariaLabel: 'Rotate to east face' },
	{ key: 'south', label: 'N', ariaLabel: 'Rotate to south face' },
	{ key: 'west', label: 'W', ariaLabel: 'Rotate to west face' },
	{ key: 'top', label: 'Top', ariaLabel: 'Rotate to top view' },
	{ key: 'bottom', label: 'Bottom', ariaLabel: 'Rotate to bottom view' }
]

function createDragState() {
	return {
		active: false,
		startX: 0,
		startY: 0,
		startHeading: 0,
		startPitch: 0,
		target: null,
		range: 0,
		moved: false
	}
}

function usePointerDrag({ enabled, viewer, dragRef, setDraggingState, finishDrag, onPointerMove }) {
	useEffect(() => {
		if (!enabled || !viewer) return undefined

		const handlePointerMove = (event) => {
			const drag = dragRef.current
			if (!drag.active || !viewer) return
			onPointerMove(event, drag)
		}

		const endDrag = () => {
			finishDrag(dragRef, setDraggingState)
		}

		window.addEventListener('pointermove', handlePointerMove)
		window.addEventListener('pointerup', endDrag)
		window.addEventListener('pointercancel', endDrag)

		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			window.removeEventListener('pointerup', endDrag)
			window.removeEventListener('pointercancel', endDrag)
			if (dragRef.current.active) {
				finishDrag(dragRef, setDraggingState)
			}
		}
	}, [dragRef, enabled, finishDrag, onPointerMove, setDraggingState, viewer])
}

function ViewCube({ viewer }) {
	const [cubeTransform, setCubeTransform] = useState('rotateX(0deg) rotateY(0deg) rotateZ(0deg)')
	const [ringRotation, setRingRotation] = useState(0)
	const [isDragging, setIsDragging] = useState(false)
	const [isDraggingDial, setIsDraggingDial] = useState(false)
	const {
		clampPitchAvoidHorizontal,
		resolveOrbitTarget,
		flyToOrientation,
		applyLookAt,
		finishDrag
	} = useCameraControls(viewer)
	const frameRef = useRef(null)
	const dragStateRef = useRef(createDragState())
	const suppressClickRef = useRef(false)
	const dialDragStateRef = useRef(createDragState())
	const previousHeadingRef = useRef(null)
	const unwrappedHeadingRef = useRef(0)
	const previousRingAngleRef = useRef(null)
	const unwrappedRingAngleRef = useRef(0)

	const consumeSuppressedClick = () => {
		if (!suppressClickRef.current) return false
		suppressClickRef.current = false
		return true
	}

	useEffect(() => {
		if (!viewer) return undefined

		const unwrapAngleDegrees = (angleDeg, previousRef, unwrappedRef) => {
			if (previousRef.current === null) {
				previousRef.current = angleDeg
				unwrappedRef.current = angleDeg
				return unwrappedRef.current
			}

			let delta = angleDeg - previousRef.current
			while (delta > 180) delta -= 360
			while (delta < -180) delta += 360

			unwrappedRef.current += delta
			previousRef.current = angleDeg
			return unwrappedRef.current
		}

		const unwrapHeadingDegrees = (headingDeg) => {
			return unwrapAngleDegrees(headingDeg, previousHeadingRef, unwrappedHeadingRef)
		}

		const computeRingRotationFromTrueNorth = () => {
			const orbit = resolveOrbitTarget()
			if (!orbit || !Cesium.defined(orbit.target)) {
				return null
			}

			const up = viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(orbit.target, new Cesium.Cartesian3())
			const toNorthPole = Cesium.Cartesian3.subtract(
				NORTH_POLE_POSITION,
				orbit.target,
				new Cesium.Cartesian3()
			)

			const upProjection = Cesium.Cartesian3.multiplyByScalar(
				up,
				Cesium.Cartesian3.dot(toNorthPole, up),
				new Cesium.Cartesian3()
			)
			const northTangent = Cesium.Cartesian3.subtract(toNorthPole, upProjection, new Cesium.Cartesian3())
			if (Cesium.Cartesian3.magnitudeSquared(northTangent) < Cesium.Math.EPSILON12) {
				return null
			}

			const northDirection = Cesium.Cartesian3.normalize(northTangent, northTangent)
			const x = Cesium.Cartesian3.dot(northDirection, viewer.camera.rightWC)
			const y = Cesium.Cartesian3.dot(northDirection, viewer.camera.upWC)

			const ringAngleDeg = Cesium.Math.toDegrees(Math.atan2(x, y))
			return unwrapAngleDegrees(ringAngleDeg, previousRingAngleRef, unwrappedRingAngleRef)
		}

		const syncFromCamera = () => {
			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current)
			}

			frameRef.current = requestAnimationFrame(() => {
				const { heading, pitch, roll } = viewer.camera

				// Cesium 相機角度是弧度，CSS transform 需要角度，因此先做 rad -> deg。
				const headingDeg = Cesium.Math.toDegrees(heading)
				const pitchDeg = Cesium.Math.toDegrees(pitch)
				const rollDeg = Cesium.Math.toDegrees(roll)
				const headingUnwrapped = unwrapHeadingDegrees(headingDeg)
				const ringRotationFromTrueNorth = computeRingRotationFromTrueNorth()

				// 方塊以相機 heading 同步；方向盤使用「北極實際座標」推算的螢幕北向角。
				setCubeTransform(`rotateX(${pitchDeg}deg) rotateY(${headingUnwrapped}deg) rotateZ(${rollDeg}deg)`)
				setRingRotation(ringRotationFromTrueNorth ?? headingUnwrapped)
			})
		}

		viewer.scene.postRender.addEventListener(syncFromCamera)
		syncFromCamera()

		return () => {
			viewer.scene.postRender.removeEventListener(syncFromCamera)
			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current)
			}
			previousHeadingRef.current = null
			unwrappedHeadingRef.current = 0
			previousRingAngleRef.current = null
			unwrappedRingAngleRef.current = 0
		}
	}, [resolveOrbitTarget, viewer])

	const handleFaceClick = (face) => {
		if (consumeSuppressedClick()) return

		const orientation = FACE_ORIENTATION[face]
		if (!orientation) return
		flyToOrientation(orientation.heading, orientation.pitch, 1.15)
	}

	const handleDirectionClick = (headingDeg) => {
		if (consumeSuppressedClick()) return

		if (!viewer) return
		const currentPitch = Cesium.Math.toDegrees(clampPitchAvoidHorizontal(viewer.camera.pitch, -1))

		flyToOrientation(headingDeg, currentPitch, 0.9)
	}

	const startOrbitDrag = useCallback((event, dragRef, setDraggingState, includeVerticalDelta) => {
		if (!viewer) return

		const orbit = resolveOrbitTarget()
		if (!orbit) return

		dragRef.current = {
			...createDragState(),
			active: true,
			startX: event.clientX,
			startY: includeVerticalDelta ? event.clientY : 0,
			startHeading: viewer.camera.heading,
			startPitch: clampPitchAvoidHorizontal(viewer.camera.pitch, -1),
			target: orbit.target,
			range: orbit.range
		}

		suppressClickRef.current = false
		setDraggingState(true)
	}, [clampPitchAvoidHorizontal, resolveOrbitTarget, viewer])

	const handleDialPointerDown = (event) => {
		// 若點擊的是方向按鈕，讓 onClick 自行處理，不啟動拖曳。
		if (event.target.closest('.viewcube-direction')) return
		startOrbitDrag(event, dialDragStateRef, setIsDraggingDial, false)
	}

	const handleStageKeyDown = (event) => {
		if (!viewer) return

		const currentHeadingDeg = Cesium.Math.toDegrees(viewer.camera.heading)
		const currentPitchDeg = Cesium.Math.toDegrees(clampPitchAvoidHorizontal(viewer.camera.pitch, -1))

		let nextHeadingDeg = currentHeadingDeg
		let nextPitchDeg = currentPitchDeg
		let handled = false

		switch (event.key) {
			case 'ArrowLeft':
				nextHeadingDeg -= KEYBOARD_HEADING_STEP_DEG
				handled = true
				break
			case 'ArrowRight':
				nextHeadingDeg += KEYBOARD_HEADING_STEP_DEG
				handled = true
				break
			case 'ArrowUp':
				nextPitchDeg -= KEYBOARD_PITCH_STEP_DEG
				handled = true
				break
			case 'ArrowDown':
				nextPitchDeg += KEYBOARD_PITCH_STEP_DEG
				handled = true
				break
			default:
				break
		}

		if (!handled) return

		event.preventDefault()

		const clampedPitchDeg = Cesium.Math.toDegrees(
			clampPitchAvoidHorizontal(Cesium.Math.toRadians(nextPitchDeg), Math.sign(currentPitchDeg) || -1)
		)

		flyToOrientation(nextHeadingDeg, clampedPitchDeg, 0.45)
	}

	const handleCubePointerDown = (event) => {
		startOrbitDrag(event, dragStateRef, setIsDragging, true)
	}

	const handleCubeDragMove = useCallback((event, drag) => {
		const deltaX = event.clientX - drag.startX
		const deltaY = event.clientY - drag.startY

		if (Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
			drag.moved = true
			suppressClickRef.current = true
		}

		if (!Cesium.defined(drag.target)) {
			return
		}

		const headingSensitivity = 1.0
		const pitchSensitivity = 1.0
		const minPitch = Cesium.Math.toRadians(-MAX_ABS_PITCH_DEG)
		const maxPitch = Cesium.Math.toRadians(MAX_ABS_PITCH_DEG)

		const nextHeading = drag.startHeading + Cesium.Math.toRadians(deltaX * headingSensitivity)
		const nextPitchRaw = Cesium.Math.clamp(
			drag.startPitch - Cesium.Math.toRadians(deltaY * pitchSensitivity),
			minPitch,
			maxPitch
		)
		const nextPitch = clampPitchAvoidHorizontal(nextPitchRaw, Math.sign(drag.startPitch) || -1)

		applyLookAt(drag.target, nextHeading, nextPitch, drag.range)
	}, [applyLookAt, clampPitchAvoidHorizontal])

	const handleDialDragMove = useCallback((event, drag) => {
		const deltaX = event.clientX - drag.startX

		if (Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
			drag.moved = true
			suppressClickRef.current = true
		}

		if (!Cesium.defined(drag.target)) return

		const headingSensitivity = 1.0
		const nextHeading = drag.startHeading + Cesium.Math.toRadians(deltaX * headingSensitivity)

		applyLookAt(drag.target, nextHeading, drag.startPitch, drag.range)
	}, [applyLookAt])

	usePointerDrag({
		enabled: isDragging,
		viewer,
		dragRef: dragStateRef,
		setDraggingState: setIsDragging,
		finishDrag,
		onPointerMove: handleCubeDragMove
	})

	usePointerDrag({
		enabled: isDraggingDial,
		viewer,
		dragRef: dialDragStateRef,
		setDraggingState: setIsDraggingDial,
		finishDrag,
		onPointerMove: handleDialDragMove
	})

	if (!viewer) return null

	return (
		<div className="viewcube-widget">
			<div
				className="viewcube-dial"
				style={{ transform: `rotate(${ringRotation}deg)` }}
			>
				<div
					className={`viewcube-ring${isDraggingDial ? ' dragging' : ''}`}
					onPointerDown={handleDialPointerDown}
				/>

				{DIRECTIONS.map((dir) => (
					<button
						key={dir.label}
						className="viewcube-direction"
						style={{ '--angle': `${dir.angle}deg`, '--counter-rotate': `${-ringRotation}deg` }}
						onClick={() => handleDirectionClick(dir.heading)}
						title={`Rotate to ${dir.label}`}
						aria-label={`Rotate camera heading to ${dir.label}`}
						type="button"
					>
						{dir.label}
					</button>
				))}
			</div>

			<div
				className={`viewcube-stage ${isDragging ? 'dragging' : ''}`}
				onPointerDown={handleCubePointerDown}
				onKeyDown={handleStageKeyDown}
				tabIndex={0}
				role="group"
				aria-label="View cube control. Use arrow keys to rotate camera heading and pitch."
			>
				<div className="viewcube-cube" style={{ transform: cubeTransform }}>
					{FACE_BUTTONS.map((face) => (
						<button
							key={face.key}
							className={`viewcube-face ${face.key}`}
							onClick={() => handleFaceClick(face.key)}
							aria-label={face.ariaLabel}
							type="button"
						>
							{face.label}
						</button>
					))}
				</div>
			</div>
		</div>
	)
}

export default ViewCube
