/* ============================================
   store.js — Capa de datos de la plataforma
   Única responsable de la persistencia.
   Hoy usa localStorage; mañana se reescribe
   este archivo para apuntar a Supabase/API.
   ============================================ */

const Store = (() => {
  // ---- claves ----
  const K_AUTH    = 'nutri-auth';
  const K_USERS   = 'nutri-users';
  const K_CLIENTS = 'nutri-clients';
  const K_APPTS   = 'nutri-appointments';
  const K_PROGRESS = (id) => 'nutri-progress-' + id;

  // ---- helpers ----
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('Store write failed', key, e); return false; }
  };
  const uid = () =>
    Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

  // ============================================
  //  SESIÓN  (compatible con landing.js)
  // ============================================
  const getCurrentUser = () => read(K_AUTH, null);
  const isLoggedIn     = () => !!getCurrentUser();
  const logout         = () => localStorage.removeItem(K_AUTH);

  // ============================================
  //  CLIENTES
  // ============================================
  const getClients = () => read(K_CLIENTS, []);

  const getClient = (id) => getClients().find(c => c.id === id) || null;

  const saveClient = (data) => {
    const clients = getClients();
    if (data.id) {
      // actualizar
      const i = clients.findIndex(c => c.id === data.id);
      if (i >= 0) {
        clients[i] = { ...clients[i], ...data, updatedAt: new Date().toISOString() };
        write(K_CLIENTS, clients);
        return clients[i];
      }
    }
    // crear
    const client = {
      id: uid(),
      name: '',
      email: '',
      phone: '',
      age: '',
      gender: '',
      height: '',
      goal: '',
      notes: '',
      ...data,
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    write(K_CLIENTS, clients);
    return client;
  };

  const deleteClient = (id) => {
    write(K_CLIENTS, getClients().filter(c => c.id !== id));
    // limpiar datos asociados
    localStorage.removeItem(K_PROGRESS(id));
    localStorage.removeItem('nutri-plan-' + id);
    localStorage.removeItem('nutri-plan-' + id + '-dist');
    localStorage.removeItem('nutri-plan-' + id + '-struct');
    // borrar sus citas
    write(K_APPTS, getAppointments().filter(a => a.clientId !== id));
  };

  const hasPlan = (id) => !!localStorage.getItem('nutri-plan-' + id);

  // ============================================
  //  PROGRESO  (mediciones por cliente)
  // ============================================
  const getProgress = (clientId) =>
    read(K_PROGRESS(clientId), [])
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const addProgress = (clientId, entry) => {
    const list = read(K_PROGRESS(clientId), []);
    list.push({
      id: uid(),
      date: entry.date || new Date().toISOString().slice(0, 10),
      weight: entry.weight ?? '',
      waist: entry.waist ?? '',
      hip: entry.hip ?? '',
      bodyfat: entry.bodyfat ?? '',
      notes: entry.notes ?? '',
    });
    write(K_PROGRESS(clientId), list);
    return list;
  };

  const deleteProgress = (clientId, entryId) => {
    write(K_PROGRESS(clientId),
      read(K_PROGRESS(clientId), []).filter(e => e.id !== entryId));
  };

  // ============================================
  //  AGENDA / CITAS
  // ============================================
  const getAppointments = () =>
    read(K_APPTS, [])
      .slice()
      .sort((a, b) =>
        (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  const getAppointmentsByDate = (dateStr) =>
    getAppointments().filter(a => a.date === dateStr);

  const saveAppointment = (data) => {
    const appts = read(K_APPTS, []);
    if (data.id) {
      const i = appts.findIndex(a => a.id === data.id);
      if (i >= 0) {
        appts[i] = { ...appts[i], ...data };
        write(K_APPTS, appts);
        return appts[i];
      }
    }
    const appt = {
      id: uid(),
      clientId: '',
      title: '',
      date: '',
      time: '',
      duration: 60,
      notes: '',
      status: 'pendiente', // pendiente | realizada | cancelada
      ...data,
      createdAt: new Date().toISOString(),
    };
    appts.push(appt);
    write(K_APPTS, appts);
    return appt;
  };

  const deleteAppointment = (id) =>
    write(K_APPTS, read(K_APPTS, []).filter(a => a.id !== id));

  // ============================================
  //  API pública
  // ============================================
  return {
    // sesión
    getCurrentUser, isLoggedIn, logout,
    // clientes
    getClients, getClient, saveClient, deleteClient, hasPlan,
    // progreso
    getProgress, addProgress, deleteProgress,
    // citas
    getAppointments, getAppointmentsByDate, saveAppointment, deleteAppointment,
  };
})();
