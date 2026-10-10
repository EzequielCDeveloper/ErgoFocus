# Feature: eas-apk-build

## Objective
Configurar el repositorio para builds reproducibles con EAS Build y producir un APK Android (perfil `preview`) con la cuenta EAS del usuario.

## Problem
- El `app.json` apunta a un proyecto EAS (`5c793a31-5b87-4729-a8f3-5da3d12fe273`) propiedad de `elsupa`, sin acceso desde la cuenta logueada `sora13507` → cualquier build falla con `Entity Not Authorized`.
- Hay un APK de 57 MB trackeado en git (`ErgoFocus-v1.0.0.apk`) que EAS subiría en cada build y engorda el repo.
- No hay `.easignore`; la higiene depende solo de `.gitignore`.

## Scope / Constraints
- Proyecto EAS **nuevo** bajo `sora13507` (decisión del usuario, Option A).
- Perfil de build: `preview` (APK interno) existente en `eas.json` se mantiene.
- No commitear ni pushear: el usuario no lo solicitó explícitamente (solo configuración + build en working tree).

## Tasks
- [ ] T1 — Crear documento de tareas `odd/tasks/eas-apk-build.md` + mirror Engram (topic `odd/eas-apk-build/tasks`)
- [ ] T2 — Higiene del repo: añadir `*.apk`/`*.aab` a `.gitignore`; `git rm --cached ErgoFocus-v1.0.0.apk` (mantener archivo local)
- [ ] T3 — `app.json`: quitar `owner: "elsupa"` y el `extra.eas.projectId` viejo (para que `eas init` cree uno nuevo)
- [ ] T4 — `eas init --account sora13507 --non-interactive` → crea/víncula proyecto y escribe projectId nuevo
- [ ] T5 — `eas build -p android --profile preview --non-interactive` → APK en la nube
- [ ] T6 — Verificar build OK, capturar URL del artefacto y reportar

## Acceptance Criteria
- `eas project:info` o `eas build:list` responden sin error de permisos con la cuenta `sora13507`.
- `app.json` tiene el projectId del nuevo proyecto y sin `owner` ajeno.
- `.gitignore` excluye APKs; `ErgoFocus-v1.0.0.apk` ya no está trackeado.
- El build `preview` de Android termina `finished` (o el error es reportado honestamente), con URL de descarga.

## Checks
- `npx --no-install eas-cli project:info --non-interactive`
- `git ls-files | grep -iE '\.apk$'` → sin salida
- `npx --no-install eas-cli build:list --limit 3`

## Progress
- Estado del proyecto EAS confirmado: acceso denegado al proyecto viejo (`Entity Not Authorized`); cuenta activa `sora13507` (ezequielcleyva@gmail.com). Usuario eligió crear proyecto nuevo.
- (se actualiza por tarea)