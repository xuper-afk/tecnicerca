import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { clasificarProblema, enviarMensajeTelegram } from './ia'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const iconos = {
  laptop: 'https://cdn-icons-png.flaticon.com/512/179/179915.png',
  celular: 'https://cdn-icons-png.flaticon.com/512/15/15874.png',
  redes: 'https://cdn-icons-png.flaticon.com/512/2885/2885366.png'
};

const tecnicos = [
  { 
    id: 1, 
    nombre: 'Juan Quispe', 
    especialidad: 'laptop', 
    telefono: '51952263912', 
    lat: -13.5167, 
    lng: -71.9785, 
    foto: 'https://randomuser.me/api/portraits/men/32.jpg' 
  },
  { 
    id: 2, 
    nombre: 'María Huamán', 
    especialidad: 'celular', 
    telefono: '51952263912', 
    lat: -13.5200, 
    lng: -71.9700, 
    foto: 'https://randomuser.me/api/portraits/women/44.jpg' 
  },
  { 
    id: 3, 
    nombre: 'Carlos Mamani', 
    especialidad: 'redes', 
    telefono: '51952263912', 
    lat: -13.5100, 
    lng: -71.9850, 
    foto: 'https://randomuser.me/api/portraits/men/85.jpg' 
  },
]

function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  
  // Estados para el problema y la IA
  const [problema, setProblema] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState(null)

  // NUEVOS ESTADOS: Datos del cliente
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')

  useEffect(() => {
    if (map.current) return
    const container = mapContainer.current

    map.current = new mapboxgl.Map({
      container: container,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-71.9785, -13.5167],
      zoom: 13,
    })
    
    map.current.on('load', () => {
      actualizarMarcadores(null)
    })

    container.setAttribute('data-mapbox', 'true')

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  const actualizarMarcadores = (especialidadFiltro = null) => {
    if (markersRef.current.length === 0) {
      tecnicos.forEach((t) => {
        const el = document.createElement('div');
        el.style.backgroundImage = `url(${iconos[t.especialidad]})`;
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundSize = 'cover';
        el.style.backgroundColor = 'white';
        el.style.borderRadius = '50%';
        el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        el.addEventListener('click', () => {
          setTecnicoSeleccionado(t);
          if (map.current) map.current.flyTo({ center: [t.lng, t.lat], zoom: 15 });
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([t.lng, t.lat])
          .addTo(map.current);

        markersRef.current.push({ marker, especialidad: t.especialidad, el });
      });
    }

    markersRef.current.forEach(({ marker, especialidad, el }) => {
      if (especialidadFiltro && especialidad !== especialidadFiltro) {
        marker.getElement().style.display = 'none';
      } else {
        marker.getElement().style.display = 'block';
        el.style.border = especialidadFiltro ? '3px solid #22c55e' : '3px solid #2563eb';
      }
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!problema) return
    setCargando(true)
    setResultado(null)
    setTecnicoSeleccionado(null)
    
    try {
      const iaResult = await clasificarProblema(problema)
      setResultado(iaResult)
      
      if (iaResult.equipo === 'laptop' || iaResult.equipo === 'celular' || iaResult.equipo === 'redes') {
        actualizarMarcadores(iaResult.equipo)
        
        const tecnicoRecomendado = tecnicos.find(t => t.especialidad === iaResult.equipo)
        if (tecnicoRecomendado) {
          setTecnicoSeleccionado(tecnicoRecomendado)
          if (map.current) map.current.flyTo({ center: [tecnicoRecomendado.lng, tecnicoRecomendado.lat], zoom: 15 })
        }
      } else {
        actualizarMarcadores(null)
      }
    } catch (error) { alert("Hubo un error al analizar el problema."); console.error(error); } finally { setCargando(false); }
  }

  const handleEnviarTelegram = async () => {
    setEnviando(true);
    try {
      // Incluimos los datos del cliente en el mensaje
      await enviarMensajeTelegram(`🚨 TecniCerca: Nueva solicitud.\n\n👤 Cliente: ${nombreCliente || 'No especificado'}\n📞 Teléfono: ${telefonoCliente || 'No especificado'}\n💻 Equipo: ${resultado.equipo}\n🔧 Falla: ${resultado.falla}\n⚠️ Urgencia: ${resultado.urgencia}`);
      alert("¡Alerta enviada a Telegram con éxito!");
    } catch (error) { alert("Error al enviar."); } finally { setEnviando(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <header style={{ height: '64px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 24px', zIndex: 20 }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111827' }}>
          TecniCerca <span style={{ color: '#2563eb' }}>🛠️</span>
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Cusco, Perú</span>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e5e7eb' }}></div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <aside style={{ width: '380px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
          
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#111827' }}>¿Qué necesitas reparar?</h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280' }}>Describe tu problema y nuestra IA encontrará al mejor técnico cerca de ti.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* NUEVOS CAMPOS DEL CLIENTE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Tu Nombre</label>
                <input 
                  type="text" 
                  placeholder="Ej: Pabel Junior"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Tu Teléfono</label>
                <input 
                  type="text" 
                  placeholder="Ej: +51 987 654 321"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Descripción del problema</label>
              <textarea 
                placeholder="Ej: Mi laptop no enciende y hace un ruido raro..."
                value={problema}
                onChange={(e) => setProblema(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            
            <button type="submit" disabled={cargando} style={{ 
              padding: '14px', 
              background: cargando ? '#93c5fd' : '#2563eb',
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: cargando ? 'wait' : 'pointer', 
              fontWeight: '600', 
              fontSize: '15px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              transition: 'background 0.3s'
            }}>
              {cargando ? (
                <>
                  <div style={{ 
                    width: '16px', height: '16px', 
                    border: '2px solid white', 
                    borderTop: '2px solid transparent', 
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  Analizando problema...
                </>
              ) : 'Buscar Técnico'}
            </button>
          </form>

          {resultado && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#111827' }}>Técnico Recomendado</h3>
              
              {tecnicoSeleccionado && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <img src={tecnicoSeleccionado.foto} alt="Técnico" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }} />
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#111827' }}>{tecnicoSeleccionado.nombre}</h4>
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                        Experto en {tecnicoSeleccionado.especialidad}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a href={`https://wa.me/${tecnicoSeleccionado.telefono}?text=Hola%20${tecnicoSeleccionado.nombre},%20vi%20tu%20perfil%20en%20TecniCerca.%20Tengo%20un%20problema%20con%20mi%20${tecnicoSeleccionado.especialidad}.`} 
                       target="_blank"
                       style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#25D366', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                      WhatsApp
                    </a>
                    <a href={`tel:${tecnicoSeleccionado.telefono}`}
                       style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                      Llamar
                    </a>
                  </div>
                </div>
              )}

              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>Diagnóstico de la IA:</p>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#0f172a' }}><b>Falla:</b> {resultado.falla}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}><b>Urgencia:</b> <span style={{ color: resultado.urgencia === 'alta' ? '#dc2626' : '#d97706', fontWeight: 'bold' }}>{resultado.urgencia}</span></p>
              </div>

              <button onClick={handleEnviarTelegram} disabled={enviando} style={{ width: '100%', padding: '12px', background: '#0088cc', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                {enviando ? 'Enviando...' : 'Registrar Solicitud (Telegram)'}
              </button>
            </div>
          )}
        </aside>

        <main style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </main>
      </div>
    </div>
  )
}

export default App