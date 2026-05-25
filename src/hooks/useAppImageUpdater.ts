import { useState, useCallback } from 'react';

export interface AppImageUpdaterResult {
  isChecking: boolean;
  isUpdating: boolean;
  statusMessage: string;
  progress: number;
  checkForUpdatesAndReplace: (appName: string, updateUrl: string) => Promise<boolean>;
}

export function useAppImageUpdater(): AppImageUpdaterResult {
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const checkForUpdatesAndReplace = useCallback(async (appName: string, updateUrl: string): Promise<boolean> => {
    try {
      setIsChecking(true);
      setStatusMessage(`Scanning for existing ${appName} desktop installation...`);
      setProgress(10);
      
      // Simulate checking for existing AppImage installation (e.g. at ~/.local/bin/ or ~/Applications/)
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(30);
      
      // Simulate finding the AppImage
      setStatusMessage(`Found existing ${appName} AppImage. Target version ready for replacement.`);
      setIsChecking(false);
      
      setIsUpdating(true);
      setProgress(40);
      
      // Simulate downloading the updated AppImage
      setStatusMessage(`Downloading update from endpoint...`);
      for (let i = 40; i <= 80; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(i);
      }
      
      // Simulate replacing the current AppImage and extracting desktop integration files
      setStatusMessage(`Replacing existing binary and updating desktop entry...`);
      await new Promise(resolve => setTimeout(resolve, 1200));
      setProgress(95);
      
      setStatusMessage(`Successfully updated ${appName} AppImage.`);
      setProgress(100);
      
      // Reset statuses after a short delay
      setTimeout(() => {
        setIsUpdating(false);
        setStatusMessage('');
        setProgress(0);
      }, 3000);
      
      return true;
    } catch (error) {
      console.error("Failed to update AppImage:", error);
      setIsChecking(false);
      setIsUpdating(false);
      setStatusMessage(`Error: Failed to update ${appName}.`);
      setProgress(0);
      return false;
    }
  }, []);

  return {
    isChecking,
    isUpdating,
    statusMessage,
    progress,
    checkForUpdatesAndReplace
  };
}
