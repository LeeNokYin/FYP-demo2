import { useEffect, useMemo, useRef, useState } from 'react'
import * as Cesium from 'cesium'
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

const MIN_ABS_PITCH_DEG = 1
const MAX_ABS_PITCH_DEG = 89
const MIN_ORBIT_RANGE = 500

function ViewCube({ viewer }) {
	const [cubeTransform, setCubeTransform] = useState('rotateX(0deg) rotateY(0deg) rotateZ(0deg)')
	const [ringRotation, setRingRotation] = useState(0)
	const [isDragging, setIsDragging] = useState(false)
	const [isDraggingDial, setIsDraggingDial] = useState(false)
	const frameRef = useRef(null)
	const dragStateRef = useRef({
		active: false,
		startX: 0,
		startY: 0,
		startHeading: 0,
		startPitch: 0,
		target: null,
		range: 0,
		moved: false
	})
	const suppressClickRef = useRef(false)
	const dialDragStateRef = useRef({
		active: false,
		startX: 0,
		startHeading: 0,
		startPitch: 0,
		target: null,
		range: 0,
		moved: false
	})
	const lastOrbitRef = useRef({
		target: null,
		range: 0
	})
	const previousHeadingRef = useRef(null)
	const unwrappedHeadingRef = useRef(0)

	const clampPitchAvoidHorizontal = (pitchRad, fallbackSign = -1) => {
		const minAbs = Cesium.Math.toRadians(MIN_ABS_PITCH_DEG)
		const maxAbs = Cesium.Math.toRadians(MAX_ABS_PITCH_DEG)

		let clamped = Cesium.Math.clamp(pitchRad, -maxAbs, maxAbs)
		if (Math.abs(clamped) < minAbs) {
			const sign = clamped === 0 ? (fallbackSign >= 0 ? 1 : -1) : Math.sign(clamped)
			clamped = sign * minAbs
		}

		return clamped
	}

	const resolveOrbitTarget = () => {
		if (!viewer) return null

		const scene = viewer.scene
		const ellipsoid = scene.globe.ellipsoid
		const canvas = scene.canvas
		const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)

		let target = scene.pickPosition(center)
		if (!Cesium.defined(target)) {
			target = viewer.camera.pickEllipsoid(center, ellipsoid)
		}

		if (!Cesium.defined(target)) {
			if (Cesium.defined(lastOrbitRef.current.target) && lastOrbitRef.current.range > 0) {
				return lastOrbitRef.current
			}
			return null
		}

		const range = Cesium.Cartesian3.distance(viewer.camera.positionWC, target)
		if (!Number.isFinite(range) || range <= 0) {
			if (Cesium.defined(lastOrbitRef.current.target) && lastOrbitRef.current.range > 0) {
				return lastOrbitRef.current
			}
			return null
		}

		lastOrbitRef.current = { target, range }
		return lastOrbitRef.current
	}

	const flyToOrientation = useMemo(
		() =>
			(headingDeg, pitchDeg, duration = 1.0) => {
				if (!viewer) return

				const scene = viewer.scene
				const ellipsoid = scene.globe.ellipsoid
				const canvas = scene.canvas
				const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)

				let target = scene.pickPosition(center)
				if (!Cesium.defined(target)) {
					target = viewer.camera.pickEllipsoid(center, ellipsoid)
				}

				if (!Cesium.defined(target)) {
					return
				}

				const range = Cesium.Cartesian3.distance(viewer.camera.positionWC, target)
				const sphere = new Cesium.BoundingSphere(target, 1.0)

				const clampedPitch = clampPitchAvoidHorizontal(Cesium.Math.toRadians(pitchDeg), -1)

				viewer.camera.flyToBoundingSphere(sphere, {
					offset: new Cesium.HeadingPitchRange(
						Cesium.Math.toRadians(headingDeg),
						clampedPitch,
						range
					),
					duration,
					easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
				})
			},
		[viewer]
	)

	useEffect(() => {
		if (!viewer) return undefined

		const unwrapHeadingDegrees = (headingDeg) => {
			if (previousHeadingRef.current === null) {
				previousHeadingRef.current = headingDeg
				unwrappedHeadingRef.current = headingDeg
				return unwrappedHeadingRef.current
			}

			let delta = headingDeg - previousHeadingRef.current

			// 修正 359 -> 0 或 0 -> 359 時的角度回繞，避免方向盤瞬間反向跳轉。
			while (delta > 180) delta -= 360
			while (delta < -180) delta += 360

			unwrappedHeadingRef.current += delta
			previousHeadingRef.current = headingDeg
			return unwrappedHeadingRef.current
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

				// 與相機 heading 保持同向，避免方塊與方向盤出現反向旋轉。
				setCubeTransform(`rotateX(${pitchDeg}deg) rotateY(${headingUnwrapped}deg) rotateZ(${rollDeg}deg)`)
				setRingRotation(-headingUnwrapped)
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
		}
	}, [viewer])

	const handleFaceClick = (face) => {
		if (suppressClickRef.current) {
			suppressClickRef.current = false
			return
		}

		const orientation = FACE_ORIENTATION[face]
		if (!orientation) return
		flyToOrientation(orientation.heading, orientation.pitch, 1.15)
	}

	const handleDirectionClick = (headingDeg) => {
		if (suppressClickRef.current) {
			suppressClickRef.current = false
			return
		}

		if (!viewer) return
		const currentPitch = Cesium.Math.toDegrees(clampPitchAvoidHorizontal(viewer.camera.pitch, -1))

		flyToOrientation(headingDeg, currentPitch, 0.9)
	}

	const handleDialPointerDown = (event) => {
		// 若點擊的是方向按鈕，讓 onClick 自行處理，不啟動拖曳。
		if (event.target.closest('.viewcube-direction')) return
		if (!viewer) return

		const orbit = resolveOrbitTarget()
		if (!orbit) return

		dialDragStateRef.current = {
			active: true,
			startX: event.clientX,
			startHeading: viewer.camera.heading,
			startPitch: clampPitchAvoidHorizontal(viewer.camera.pitch, -1),
			target: orbit.target,
			range: orbit.range,
			moved: false
		}

		suppressClickRef.current = false
		setIsDraggingDial(true)
	}

	const handleCubePointerDown = (event) => {
		if (!viewer) return

		const orbit = resolveOrbitTarget()
		if (!orbit) return

		dragStateRef.current = {
			active: true,
			startX: event.clientX,
			startY: event.clientY,
			startHeading: viewer.camera.heading,
			startPitch: clampPitchAvoidHorizontal(viewer.camera.pitch, -1),
			target: orbit.target,
			range: orbit.range,
			moved: false
		}

		suppressClickRef.current = false
		setIsDragging(true)
	}

	useEffect(() => {
		if (!isDragging || !viewer) return undefined

		const headingSensitivity = 1.0
		const pitchSensitivity = 1.0
		const minPitch = Cesium.Math.toRadians(-MAX_ABS_PITCH_DEG)
		const maxPitch = Cesium.Math.toRadians(MAX_ABS_PITCH_DEG)

		const onPointerMove = (event) => {
			const drag = dragStateRef.current
			if (!drag.active || !viewer) return

			const deltaX = event.clientX - drag.startX
			const deltaY = event.clientY - drag.startY

			if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
				drag.moved = true
				suppressClickRef.current = true
			}

			if (!Cesium.defined(drag.target)) {
				return
			}

			const nextHeading = drag.startHeading + Cesium.Math.toRadians(deltaX * headingSensitivity)
			const nextPitchRaw = Cesium.Math.clamp(
				drag.startPitch - Cesium.Math.toRadians(deltaY * pitchSensitivity),
				minPitch,
				maxPitch
			)
			const nextPitch = clampPitchAvoidHorizontal(nextPitchRaw, Math.sign(drag.startPitch) || -1)
			const clampedRange = Math.max(MIN_ORBIT_RANGE, drag.range)

			viewer.camera.lookAt(
				drag.target,
				new Cesium.HeadingPitchRange(nextHeading, nextPitch, clampedRange)
			)
		}

		const endDrag = () => {
			dragStateRef.current.active = false
			viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
			setIsDragging(false)
		}

		window.addEventListener('pointermove', onPointerMove)
		window.addEventListener('pointerup', endDrag)
		window.addEventListener('pointercancel', endDrag)

		return () => {
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('pointerup', endDrag)
			window.removeEventListener('pointercancel', endDrag)
		}
	}, [isDragging, viewer])

	useEffect(() => {
		if (!isDraggingDial || !viewer) return undefined

		const headingSensitivity = 1.0

		const onPointerMove = (event) => {
			const drag = dialDragStateRef.current
			if (!drag.active || !viewer) return

			const deltaX = event.clientX - drag.startX

			if (Math.abs(deltaX) > 3) {
				drag.moved = true
				suppressClickRef.current = true
			}

			if (!Cesium.defined(drag.target)) return

			const nextHeading = drag.startHeading + Cesium.Math.toRadians(deltaX * headingSensitivity)
			const clampedRange = Math.max(MIN_ORBIT_RANGE, drag.range)

			viewer.camera.lookAt(
				drag.target,
				new Cesium.HeadingPitchRange(nextHeading, drag.startPitch, clampedRange)
			)
		}

		const endDrag = () => {
			dialDragStateRef.current.active = false
			viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
			setIsDraggingDial(false)
		}

		window.addEventListener('pointermove', onPointerMove)
		window.addEventListener('pointerup', endDrag)
		window.addEventListener('pointercancel', endDrag)

		return () => {
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('pointerup', endDrag)
			window.removeEventListener('pointercancel', endDrag)
		}
	}, [isDraggingDial, viewer])

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
						type="button"
					>
						{dir.label}
					</button>
				))}
			</div>

			<div
				className={`viewcube-stage ${isDragging ? 'dragging' : ''}`}
				onPointerDown={handleCubePointerDown}
			>
				<div className="viewcube-cube" style={{ transform: cubeTransform }}>
					<button className="viewcube-face south" onClick={() => handleFaceClick('south')} type="button">S</button>
					<button className="viewcube-face east" onClick={() => handleFaceClick('east')} type="button">E</button>
					<button className="viewcube-face north" onClick={() => handleFaceClick('north')} type="button">N</button>
					<button className="viewcube-face west" onClick={() => handleFaceClick('west')} type="button">W</button>
					<button className="viewcube-face top" onClick={() => handleFaceClick('top')} type="button">Top</button>
					<button className="viewcube-face bottom" onClick={() => handleFaceClick('bottom')} type="button">Bottom</button>
				</div>
			</div>
		</div>
	)
}

export default ViewCube
