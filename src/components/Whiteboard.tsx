import React, { useState, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';

export const Whiteboard = () => {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState<any[]>([]);
  const isDrawing = useRef(false);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y] }]);
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
      <div className="bg-slate-100 p-3 flex gap-2">
        <button className="bg-white px-4 py-1 rounded-lg border text-sm font-bold shadow-sm" onClick={() => setLines([])}>נקה לוח</button>
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
              stroke="#0f172a"
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
