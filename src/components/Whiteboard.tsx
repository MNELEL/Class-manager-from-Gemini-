import React, { useState, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';

export const Whiteboard = () => {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState<any[]>([]);
  const [color, setColor] = useState('#000000');
  const isDrawing = useRef(false);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, color, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastLine = lines[lines.length - 1];
    
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    
    // Replace last line
    lines.splice(lines.length - 1, 1, lastLine);
    setLines([...lines]);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  return (
    <div className="border-4 border-slate-200 rounded-3xl overflow-hidden bg-white shadow-inner">
      <div className="bg-slate-100 p-3 flex gap-2 items-center justify-between">
        <button className="bg-white px-4 py-1 rounded-lg border text-sm font-bold shadow-sm" onClick={() => setLines([])}>נקה לוח</button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">צבע ציור:</span>
          <button 
            onClick={() => setColor('#000000')} 
            className={`w-6 h-6 rounded-full bg-black border-2 transition-all ${color === '#000000' ? 'border-slate-500 scale-110 shadow-sm' : 'border-transparent'}`}
            title="שחור"
          />
          <button 
            onClick={() => setColor('#2563eb')} 
            className={`w-6 h-6 rounded-full bg-blue-600 border-2 transition-all ${color === '#2563eb' ? 'border-sky-300 scale-110 shadow-sm' : 'border-transparent'}`}
            title="כחול"
          />
          <button 
            onClick={() => setColor('#dc2626')} 
            className={`w-6 h-6 rounded-full bg-red-600 border-2 transition-all ${color === '#dc2626' ? 'border-rose-300 scale-110 shadow-sm' : 'border-transparent'}`}
            title="אדום"
          />
        </div>
      </div>
      <Stage
        width={800}
        height={400}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        className="w-full h-full bg-white cursor-crosshair"
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.color || "#090d16"}
              strokeWidth={5}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
