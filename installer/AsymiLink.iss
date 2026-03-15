; AsymiLink AI - Inno Setup Installer Script
;
; Requirements:
;   - Inno Setup 6.x (https://jrsoftware.org/isinfo.php)
;   - Node.js portable bundle placed in installer/node/
;     (download from https://nodejs.org/en/download — Windows x64 ZIP)
;   - Built app in build/ directory (run: pnpm run build first)
;
; Build command (from project root, after pnpm run build):
;   iscc installer\AsymiLink.iss

#define MyAppName "AsymiLink AI"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "AsymiLink"
#define MyAppURL "https://asymilink.ai"
#define MyAppExeName "AsymiLink.bat"
#define MyAppId "{{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=no
LicenseFile=..\LICENSE
OutputDir=..\dist-installer
OutputBaseFilename=AsymiLink-AI-Setup-v{#MyAppVersion}
SetupIconFile=..\public\favicon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
WizardSmallImageFile=wizard-small.bmp
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=commandline

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startmenuicon"; Description: "Create a Start Menu shortcut"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checked

[Files]
; App launcher script and batch file
Source: "launcher.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "AsymiLink.bat"; DestDir: "{app}"; Flags: ignoreversion

; Built Remix app (client + server bundles)
Source: "..\build\*"; DestDir: "{app}\build"; Flags: ignoreversion recursesubdirs createallsubdirs

; Node modules needed at runtime (wrangler + deps)
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; Wrangler config
Source: "..\wrangler.toml"; DestDir: "{app}"; Flags: ignoreversion

; Environment file template
Source: "..\installer\.env.template"; DestDir: "{app}"; DestName: ".env.local"; Flags: onlyifdoesntexist

; Bundled Node.js (place node.exe + node_modules in installer/node/)
Source: "node\*"; DestDir: "{app}\node"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\node\node.exe"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent shellexec

[Code]
function AddToPath(const Path: string): boolean;
var
  CurrentPath: string;
  RegKey: string;
begin
  RegKey := 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment';
  Result := True;
  if not RegQueryStringValue(HKEY_LOCAL_MACHINE, RegKey, 'Path', CurrentPath) then
  begin
    if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', CurrentPath) then
    begin
      CurrentPath := '';
    end;
  end;
  if Pos(LowerCase(Path), LowerCase(CurrentPath)) = 0 then
  begin
    if Length(CurrentPath) > 0 then
      CurrentPath := CurrentPath + ';';
    CurrentPath := CurrentPath + Path;
    RegWriteStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', CurrentPath);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    AddToPath(ExpandConstant('{app}\node'));
  end;
end;
