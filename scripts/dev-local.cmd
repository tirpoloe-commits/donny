@echo off
set "ROOT=%~dp0.."
set "PATH=%ROOT%\.tools\node-v24.16.0-win-x64;%PATH%"
set "npm_config_cache=%ROOT%\.npm-cache"
cd /d "%ROOT%"
"%ROOT%\.tools\node-v24.16.0-win-x64\npm.cmd" run dev
