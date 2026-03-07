import React from 'react';
import { Plus, Minus, Home, Layers, Settings, Map as MapIcon } from 'lucide-react';

// 定義可重用的單一按鈕樣式，避免重複程式碼
const ToolButton = ({ icon: Icon, onClick, title, active = false }) => (
  <button
    onClick={onClick}
    title={title}
    className={`
      p-2.5 rounded-lg transition-all duration-300 ease-in-out
      flex items-center justify-center
      ${active 
        ? 'bg-gradient-to-br from-[#4ECDC4] to-[#45B7D1] text-[#1a1a2e] shadow-lg shadow-[#4ECDC4]/30' 
        : 'bg-gradient-to-br from-[#2d2d44] to-[#1e1e30] text-[#4ECDC4] hover:from-[#3d3d54] hover:to-[#2d2d44] hover:text-white hover:shadow-lg hover:shadow-[#4ECDC4]/20'
      }
      shadow-md border border-[#4ECDC4]/30 backdrop-blur-md hover:border-[#4ECDC4]/60
      font-weight-600
    `}
  >
    <Icon size={20} strokeWidth={2.5} />
  </button>
);

const Toolbar = ({ viewer }) => {
  // 處理縮放功能
  const handleZoomIn = () => {
    if (viewer) {
      viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.3);
    }
  };

  const handleZoomOut = () => {
    if (viewer) {
      viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.3);
    }
  };

  // 處理返回預設視角（Home）
  const handleHome = () => {
    if (viewer) {
      viewer.camera.flyHome();
    }
  };

  return (
    <div className="absolute top-20 left-5 z-50 flex flex-col gap-3">
      {/* 第 1 組：地圖控制 */}
      <div className="flex flex-col gap-1.5 bg-gradient-to-br from-[#1a1a2e]/95 to-[#16213e]/95 backdrop-blur-md p-2.5 rounded-2xl shadow-2xl shadow-[#000000]/50 border border-[#4ECDC4]/20">
        <ToolButton icon={Plus} onClick={handleZoomIn} title="Zoom In" />
        <ToolButton icon={Minus} onClick={handleZoomOut} title="Zoom Out" />
        <div className="h-px w-full bg-gradient-to-r from-[#4ECDC4]/0 via-[#4ECDC4]/40 to-[#4ECDC4]/0 my-1" />
        <ToolButton icon={Home} onClick={handleHome} title="Return to Default View (Home)" />
      </div>

      {/* 第 2 組：功能切換 */}
      <div className="flex flex-col gap-1.5 bg-gradient-to-br from-[#1a1a2e]/95 to-[#16213e]/95 backdrop-blur-md p-2.5 rounded-2xl shadow-2xl shadow-[#000000]/50 border border-[#4ECDC4]/20">
        <ToolButton icon={Layers} title="Layer Management (Layers)" onClick={() => alert('Open Layer Menu')} />
        <ToolButton icon={MapIcon} title="Switch Basemap (Map)" onClick={() => alert('Switch Basemap')} />
        <ToolButton icon={Settings} title="Settings" onClick={() => alert('Open Settings')} />
      </div>
    </div>
  );
};

export default Toolbar;