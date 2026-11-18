# Estructura del frontend

El frontend s'organitza en tres carpetes globals, una per cada llenguatge:

```text
frontend/
  html/  Pàgines de l'aplicació
  css/   Fulls d'estil
  js/
    core/          API compartida, sessió, permisos i validacions
    auth/          Inici de sessió, registre i accés denegat
    admin/         Panell i eines d'administració
    dashboard/     Panell personal i perfil
    chargers/      API de carregadors
    reservations/  Disponibilitat, reserves i API
    schedules/     Editor i API d'horaris
    users/         API d'usuaris
```

Les pàgines carreguen els recursos amb rutes des de l'arrel del servidor: `/css/...` i `/js/...`. Les adreces principals són `/html/login.html`, `/html/register.html`, `/html/dashboard.html`, `/html/admin.html` i `/html/error.html`.

Els mòduls JavaScript s'agrupen per àrea perquè siga més fàcil localitzar-los. Les pàgines carreguen els punts d'entrada, com `/js/auth/login.js`, `/js/dashboard/dashboard.js` i `/js/admin/admin.js`; els imports entre carpetes utilitzen rutes relatives.
