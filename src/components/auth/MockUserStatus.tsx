'use client';

import { useState, useEffect } from 'react';

export default function MockUserStatus() {
  const [mockUser, setMockUser] = useState<any>(null);

  useEffect(() => {
    checkMockUser();
  }, []);

  const checkMockUser = () => {
    const stored = localStorage.getItem('mockUser');
    if (stored) {
      setMockUser(JSON.parse(stored));
    }
  };

  const clearMockUser = () => {
    localStorage.removeItem('mockUser');
    setMockUser(null);
    window.location.reload();
  };

  const refreshPage = () => {
    window.location.reload();
  };

  if (!mockUser) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-blue-800 font-medium">
            🧪 Mock User Active: {mockUser.email}
          </div>
          <div className="text-blue-600 text-sm">
            Local test user - no authentication required
          </div>
        </div>
        <div className="space-x-2">
          <button
            onClick={refreshPage}
            className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600"
          >
            Refresh
          </button>
          <button
            onClick={clearMockUser}
            className="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600"
          >
            Clear Mock User
          </button>
        </div>
      </div>
    </div>
  );
}