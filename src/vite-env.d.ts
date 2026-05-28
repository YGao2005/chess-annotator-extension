/// <reference types="vite/client" />
/// <reference types="chrome" />

declare module '*.css' {
  const content: string;
  export default content;
}

interface Window {
  showDirectoryPicker(options?: { mode?: string }): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemDirectoryHandle {
  queryPermission(descriptor?: { mode?: string }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: string }): Promise<PermissionState>;
}
