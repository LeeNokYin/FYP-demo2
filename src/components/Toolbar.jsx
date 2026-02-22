import React from 'react';
import { Plus, Minus, Home, Layers, Settings, Map as MapIcon } from 'lucide-react';

// 定義單個按鈕的樣式組件，避免重複代碼
const ToolButton = ({ icon: Icon, onClick, title, active = false }) => (
  <button
    onClick={onClick}
    title={title}
    className={`
      p-2 rounded-lg transition-all duration-200 ease-in-out
      flex items-center justify-center
      ${active 
        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }
      shadow-sm border border-gray-200
    `}
  >
    <Icon size={20} strokeWidth={2} />
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

  // 處理回到原點 (Home)
  const handleHome = () => {
    if (viewer) {
      viewer.camera.flyHome();
    }
  };

  return (
    <div className="absolute top-5 left-5 z-50 flex flex-col gap-3">
      {/* 第一組：地圖操作 */}
      <div className="flex flex-col gap-1 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-gray-200/50">
        <ToolButton icon={Plus} onClick={handleZoomIn} title="放大" />
        <ToolButton icon={Minus} onClick={handleZoomOut} title="縮小" />
        <div className="h-px w-full bg-gray-200 my-0.5" /> {/* 分隔線 */}
        <ToolButton icon={Home} onClick={handleHome} title="回到預設視角" />
      </div>

      {/* 第二組：功能切換 */}
      <div className="flex flex-col gap-1 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-gray-200/50">
        <ToolButton icon={Layers} title="圖層管理" onClick={() => alert('開啟圖層選單')} />
        <ToolButton icon={MapIcon} title="切換地圖底圖" onClick={() => alert('切換底圖')} />
        <ToolButton icon={Settings} title="設定" onClick={() => alert('開啟設定')} />
      </div>
    </div>
  );
};

export default Toolbar;