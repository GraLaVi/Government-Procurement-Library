"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { initFetchWithAuth } from '@/lib/api/fetchWithAuth';

interface PendingRequest {
  url: string;
  options: RequestInit;
  resolve: (value: Response) => void;
  reject: (reason?: any) => void;
}

interface SessionExpiredContextValue {
  isModalOpen: boolean;
  showModal: () => void;
  hideModal: () => void;
  addPendingRequest: (request: PendingRequest) => void;
  retryPendingRequests: () => Promise<void>;
  clearPendingRequests: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextValue | null>(null);

export function SessionExpiredProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const addPendingRequest = useCallback((request: PendingRequest) => {
    setPendingRequests((prev) => [...prev, request]);
  }, []);

  const retryPendingRequests = useCallback(async () => {
    const requests = [...pendingRequests];
    setPendingRequests([]);

    // Retry all pending requests
    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          ...request.options,
          // Ensure credentials are included for retry
          credentials: request.options.credentials || 'include',
        });
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
    }
  }, [pendingRequests]);

  const clearPendingRequests = useCallback(() => {
    // Reject all pending requests
    pendingRequests.forEach((request) => {
      request.reject(new Error('Session expired - requests cancelled'));
    });
    setPendingRequests([]);
  }, [pendingRequests]);

  // Initialize fetchWithAuth when context is ready
  useEffect(() => {
    initFetchWithAuth({
      showModal,
      addPendingRequest,
    });
  }, [showModal, addPendingRequest]);

  return (
    <SessionExpiredContext.Provider
      value={{
        isModalOpen,
        showModal,
        hideModal,
        addPendingRequest,
        retryPendingRequests,
        clearPendingRequests,
      }}
    >
      {children}
    </SessionExpiredContext.Provider>
  );
}

export function useSessionExpired() {
  const context = useContext(SessionExpiredContext);
  if (!context) {
    throw new Error('useSessionExpired must be used within a SessionExpiredProvider');
  }
  return context;
}
