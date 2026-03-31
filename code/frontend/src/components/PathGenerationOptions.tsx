import React from 'react';
import type { UploadSystemSettings } from '../types/upload';

interface PathGenerationOptionsProps {
  pathHeading: number;
  onPathHeadingChange: (value: number) => void;
  useDefaultRobotWidth: boolean;
  onUseDefaultRobotWidthChange: (value: boolean) => void;
  robotWidthOverride: number;
  onRobotWidthOverrideChange: (value: number) => void;
  useDefaultCoverageWidth: boolean;
  onUseDefaultCoverageWidthChange: (value: boolean) => void;
  coverageWidthOverride: number;
  onCoverageWidthOverrideChange: (value: number) => void;
  settings: UploadSystemSettings | null;
}

const PathGenerationOptions: React.FC<PathGenerationOptionsProps> = ({
  pathHeading,
  onPathHeadingChange,
  useDefaultRobotWidth,
  onUseDefaultRobotWidthChange,
  robotWidthOverride,
  onRobotWidthOverrideChange,
  useDefaultCoverageWidth,
  onUseDefaultCoverageWidthChange,
  coverageWidthOverride,
  onCoverageWidthOverrideChange,
  settings,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <label className="text-sm text-dark-300">
        Heading (degrees)
        <input
          className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
          type="number"
          value={pathHeading}
          onChange={(e) => onPathHeadingChange(parseFloat(e.target.value) || 0)}
        />
      </label>
      <label className="text-sm text-dark-300">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useDefaultRobotWidth}
            onChange={(e) => onUseDefaultRobotWidthChange(e.target.checked)}
          />
          Use default robot width ({settings?.robot_width ?? 2} m)
        </span>
        <input
          className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 disabled:opacity-50"
          type="number"
          disabled={useDefaultRobotWidth}
          value={robotWidthOverride}
          onChange={(e) => onRobotWidthOverrideChange(parseFloat(e.target.value) || 0.1)}
        />
      </label>
      <label className="text-sm text-dark-300">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useDefaultCoverageWidth}
            onChange={(e) => onUseDefaultCoverageWidthChange(e.target.checked)}
          />
          Use default boom width ({settings?.coverage_width ?? 6} m)
        </span>
        <input
          className="mt-1 w-full rounded border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 disabled:opacity-50"
          type="number"
          disabled={useDefaultCoverageWidth}
          value={coverageWidthOverride}
          onChange={(e) => onCoverageWidthOverrideChange(parseFloat(e.target.value) || 0.1)}
        />
      </label>
    </div>
  );
};

export default PathGenerationOptions;
