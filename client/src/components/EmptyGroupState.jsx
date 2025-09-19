import React from 'react';
import { Button } from './common';

const EmptyGroupState = ({ onOpenSidebar }) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
          Select a group to start chatting
        </h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
          Choose a group from the sidebar to begin your conversation
        </p>
        <Button
          onClick={onOpenSidebar}
          variant="primary"
          size="medium"
          className="mt-4 lg:hidden"
        >
          Open Groups
        </Button>
      </div>
    </div>
  );
};

export default EmptyGroupState;
