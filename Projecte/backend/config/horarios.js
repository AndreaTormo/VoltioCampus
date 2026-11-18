const HORARIOS_CENTRO = {
  BLOQUE_1: {
    nombre: 'BLOQUE_1',
    inicio: '08:00',
    fin: '11:00',
    horas: 3,
    descripcion: 'Primera hora fins al pati'
  },
  RECREO: {
    inicio: '11:00',
    fin: '11:30',
    descripcion: 'Pati/Esplai'
  },
  BLOQUE_2: {
    nombre: 'BLOQUE_2',
    inicio: '11:30',
    fin: '14:00',
    horas: 2.5,
    descripcion: 'Des del pati fins després'
  },
  BLOQUE_3: {
    nombre: 'BLOQUE_3',
    inicio: '15:00',
    fin: '18:00',
    horas: 3,
    descripcion: 'Primera hora de la vesprada fins al pati'
  },
  BLOQUE_4: {
    nombre: 'BLOQUE_4',
    inicio: '18:15',
    fin: '21:00',
    horas: 2.75,
    descripcion: 'Des del pati fins a acabar l\'horari'
  }
};

const DIAS_LABORABLES = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

module.exports = {
  HORARIOS_CENTRO,
  DIAS_LABORABLES
};
