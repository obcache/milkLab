#define MyAppName "milkLab"
#define MyAppVersion "0.1.1"
#define MyAppExeName "milkLab.exe"

[Setup]
AppId={{23F2F59D-2180-45CA-96E3-778680C6B5A5}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=milkLab
DefaultDirName={localappdata}\Programs\milkLab
DefaultGroupName=milkLab
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\dist\installer
OutputBaseFilename=milkLab-{#MyAppVersion}-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern dark
UninstallDisplayIcon={app}\{#MyAppExeName}
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked

[Files]
Source: "..\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\milkLab"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\milkLab"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch milkLab"; Flags: nowait postinstall skipifsilent
