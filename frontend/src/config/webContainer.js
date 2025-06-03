import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null;

export const getWebContainer = async () => {
    try {
        if (webContainerInstance === null) {
            // Check if the environment supports WebContainer
            if (!window.crossOriginIsolated) {
                throw new Error('Cross-Origin Isolation is required for WebContainer');
            }

            // Initialize WebContainer with specific options
            webContainerInstance = await WebContainer.boot({
                workdirName: 'project',
                mount: {
                    // Mount point for the project files
                    '/': {
                        kind: 'directory',
                        directory: {
                            kind: 'directory',
                            entries: {}
                        }
                    }
                }
            });

            console.log('WebContainer initialized successfully');
        }
        return webContainerInstance;
    } catch (error) {
        console.error('WebContainer initialization error:', error);
        throw error;
    }
};

export const resetWebContainer = async () => {
    if (webContainerInstance) {
        try {
            await webContainerInstance.teardown();
            webContainerInstance = null;
            console.log('WebContainer reset successfully');
        } catch (error) {
            console.error('WebContainer reset error:', error);
            throw error;
        }
    }
};