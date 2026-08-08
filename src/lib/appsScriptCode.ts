import rawAppsScriptCode from '../../Codigo.gs?raw';

const defaultSpreadsheetId =
  import.meta.env.VITE_DEFAULT_SPREADSHEET_ID ||
  (import.meta.env.DEV ? '1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4' : '');

export const APPS_SCRIPT_CODE = rawAppsScriptCode.replace(
  /var DEFAULT_SPREADSHEET_ID = '.*?';/,
  `var DEFAULT_SPREADSHEET_ID = '${defaultSpreadsheetId}';`
);
