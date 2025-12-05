import { useState, useEffect, useCallback, useRef } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { useFirebase } from './main';
import { getDatabase, ref, set, onValue, get, update, remove, Database, serverTimestamp } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const ONE_TIME_APP: boolean = true;
const DEBUG: boolean = false;

function formatDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function App() {
  // Firebase App
  const firebaseApp = useFirebase();

  // Database instance
  const db: Database = getDatabase(firebaseApp);

  // Estado do contador e do máximo
  const [count, setCount] = useState(0);
  const [maxCount, setMaxCount] = useState(0);
  // Estado para controlar carregamento do count
  const [isLoading, setIsLoading] = useState(true);
  // Estado para mostrar campo de senha
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [started, setStarted] = useState<number | null>(null);
  const [ended, setEnded] = useState<number | null>(null);
  const [startedF, setStartedF] = useState<string>('');
  const [showCongrats, setShowCongrats] = useState(false);

  // Atualiza o valor do count em current-quest/count
  const updateCountInDatabase = useCallback(async (newCount: number) => {
    const countRef = ref(db, 'current-quest/count');
    const startedRef = ref(db, 'current-quest/started');
    const endedRef = ref(db, 'current-quest/ended');
    const questRef = ref(db, 'current-quest');
    const prevQuestsRef = ref(db, 'previous-quests');

    const questSnap = await get(questRef);
    const questData = questSnap.val() || {};

    let startedTs = questData.started;
    if (!startedTs) {
      startedTs = Date.now();
      await set(startedRef, startedTs);
    }

    await set(countRef, newCount);

    if (ONE_TIME_APP == false && (questData['max-count'] && newCount >= questData['max-count'])) {
      const endedTs = Date.now();
      await set(endedRef, endedTs);

      const questFinal = {
        "ended-f": formatDate(endedTs),
        "started-f": formatDate(startedTs),
        ...questData,
        count: newCount,
        ended: endedTs,
        started: startedTs
      };
      await update(prevQuestsRef, { [endedTs]: questFinal });

      // Resetando o current-quest conforme solicitado
      const newStartedTs = Date.now();
      await set(questRef, {
        count: 0,
        'max-count': questData['max-count'],
        started: newStartedTs,
        ended: null,
        "started-f": formatDate(newStartedTs)
      });
    }
  }, [db]);

  // Escuta atualizações de current-quest
  useEffect(() => {
    const questRef = ref(db, 'current-quest');
    const unsubscribe = onValue(questRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        if (typeof value.count === 'number') setCount(value.count);
        if (typeof value['max-count'] === 'number') setMaxCount(value['max-count']);
        setStarted(value.started ?? null);
        setEnded(value.ended ?? null);
        setStartedF(value['started-f'] ?? '');
        // Exibe parabéns e confetes se atingiu o maxCount
        if (typeof value.count === 'number' && typeof value['max-count'] === 'number') {
          // setShowCongrats(value.count >= value['max-count']);
          if (value.count >= value['max-count']) {
            setShowCongrats(true);
          }
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db]);

  // Handler do botão principal
  const handleIncrementClick = () => {
    setShowPasswordField(true);
    setPassword('');
    setPasswordError('');
  };

  // Handler do submit da senha
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingPassword(true);
    setPasswordError('');

    const auth = getAuth(firebaseApp);
    try {
      // Tenta logar com email fixo e senha informada
      const userCredential = await signInWithEmailAndPassword(auth, 'masterpassword@gmail.com', password);
      console.log('Usuário autenticado UID:', userCredential.user.uid);
      updateCountInDatabase(count + 1);
      setShowPasswordField(false);
    } catch (error: any) {
      setPasswordError('Senha incorreta!');
    }
    setIsCheckingPassword(false);
  };

  return (
    <>
      {/* Mensagem de parabéns e confetes */}
      {showCongrats && (
        <>
          <div
            className="congrats-message"
            style={{
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255, 121, 121, 0.73)',
              color: '#fff',
              padding: '12px 24px', // padding menor
              borderRadius: '16px',
              fontSize: '1.3rem', // fonte menor
              fontWeight: 700,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              border: '2px solid #fcff40a9',
              cursor: 'pointer',
              userSelect: 'none',
              textAlign: 'center',
              maxWidth: '320px', // largura menor
              zIndex: 10001
            }}
            onClick={ONE_TIME_APP == false ? () => setShowCongrats(false) : undefined}
            title="Clique para fechar"
          >
            🥳 Parabéns você possui um vale rebs dinner
          </div>
          <ConfettiCanvas />
        </>
      )}
      {/* Botão temporário de debug */}
      {DEBUG &&
      <button
        className="debug-btn"
        onClick={() => {
          setShowCongrats(false);
          setTimeout(() => setShowCongrats(true), 50);
        }}
        style={{ position: 'fixed', top: 24, right: 24, zIndex: 99999 }}
      >
        Debug: Parabéns
      </button>
      }
      <h1>Gabs-Quest</h1>
      <div className="card">
        <button
          onClick={(ONE_TIME_APP == true && count < maxCount || ONE_TIME_APP == false) ? handleIncrementClick : undefined}
          disabled={isLoading || showPasswordField}
          className="progress-btn"
        >
          {/* Barra de progresso no background */}
          <span
            className="progress-bar"
            style={{
              width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%',
            }}
          />
          <span className="progress-text">
            {isLoading ? 'Carregando...' : `${count}/${maxCount}`}
          </span>
        </button>
        {((ONE_TIME_APP == true && count < maxCount || ONE_TIME_APP == false) && showPasswordField) && (
          <form onSubmit={handlePasswordSubmit} className="password-form">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite a senha"
              disabled={isCheckingPassword}
              className="password-input"
            />
            <button
              type="submit"
              disabled={isCheckingPassword || !password}
              className="password-submit"
            >
              {isCheckingPassword ? 'Verificando...' : 'Confirmar'}
            </button>
            {passwordError && <div className="password-error">{passwordError}</div>}
          </form>
        )}
      </div>
    </>
  );
}

// Componente de confetes usando canvas GEPETO ME AJUDAAA
function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajusta tamanho do canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Configuração dos confetes
    const confettiCount = 30;
    const colors = ['#ff4081', '#4caf50', '#2196f3', '#ffeb3b', '#ff9800', '#9c27b0'];
    const confetti = Array.from({ length: confettiCount }).map(() => {
      const angle = (-70 + Math.random() * 140) * (Math.PI / 180);
      const speed = 7 + Math.random() * 3;
      return {
        x: canvas.width / 2,
        y: canvas.height - 120,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed - (6 + Math.random() * 2),
        size: 8 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 0.25 + Math.random() * 0.08,
        alpha: 1,
        rotation: Math.random() * 2 * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      };
    });

    let frame = 0;
    let running = true;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confetti.forEach(c => {
        // Atualiza posição
        c.x += c.vx;
        c.y += c.vy;
        c.vy += c.gravity;
        c.rotation += c.rotationSpeed;
        // Fade out
        if (frame > 40) c.alpha -= 0.02;
        // Desenha confete
        ctx.save();
        ctx.globalAlpha = Math.max(0, c.alpha);
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();
      });
      frame++;
      if (frame < 120 && running) {
        requestAnimationFrame(draw);
      }
    }

    draw();

    // Cleanup
    return () => { running = false; };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="confetti-canvas"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 10000
      }}
    />
  );
}

export default App;
