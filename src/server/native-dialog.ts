import { exec } from 'node:child_process';
import os from 'node:os';

/**
 * Abre o diálogo nativo de seleção de pasta do sistema operacional
 * e retorna o caminho absoluto selecionado ou null caso cancelado.
 */
export async function openNativeFolderDialog(): Promise<string | null> {
  const platform = os.platform();

  return new Promise((resolve) => {
    let command = '';

    if (platform === 'win32') {
      // PowerShell FolderBrowserDialog
      command = `powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq 'OK') { [Console]::WriteLine($f.SelectedPath) }"`;
    } else if (platform === 'darwin') {
      // AppleScript choose folder
      command = `osascript -e "POSIX path of (choose folder with prompt \\"Selecione o diretório do projeto\\")"`;
    } else {
      // Linux: tenta zenity ou kdialog
      command = `zenity --file-selection --directory --title="Selecione o diretório do projeto" 2>/dev/null || kdialog --getexistingdirectory 2>/dev/null`;
    }

    exec(command, { timeout: 120000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }
      const selected = stdout.trim();
      resolve(selected || null);
    });
  });
}
