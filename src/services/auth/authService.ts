import {
  initAuth,
  googleSignIn,
  logout,
  uploadBackupToDrive,
  listBackupsFromDrive,
  downloadBackupFromDrive
} from '../../lib/googleAuth';

export class AuthService {
  static initAuth(
    onAuthSuccess?: (user: any, token: string) => void,
    onAuthFailure?: () => void
  ) {
    return initAuth(onAuthSuccess, onAuthFailure);
  }

  static async googleSignIn(providedTokenOrUrl?: string) {
    return await googleSignIn(providedTokenOrUrl);
  }

  static async logout() {
    return await logout();
  }

  static async uploadBackupToDrive(token: string, backupData: any) {
    return await uploadBackupToDrive(token, backupData);
  }

  static async listBackupsFromDrive(token: string) {
    return await listBackupsFromDrive(token);
  }

  static async downloadBackupFromDrive(token: string, fileId: string) {
    return await downloadBackupFromDrive(token, fileId);
  }
}

export const authService = AuthService;
