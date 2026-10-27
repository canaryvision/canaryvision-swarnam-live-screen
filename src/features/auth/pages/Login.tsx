import React, { useState, useRef } from 'react';
import { Lock } from 'lucide-react';
import introVideo from '../../../assets/intro.mp4';
import logoImage from '../../../assets/CV_Logo.PNG';
import swarnamLogo from '../../../assets/swarnam_logo_transparent 1 (1).png';
import Logo from '../../../assets/Logo.png';
import './Login.css';

interface LoginProps { onLogin: () => void; accessPin?: string; title?: string; subtitle?: string }

const Login = ({ onLogin, accessPin = '', title = 'Welcome Back', subtitle = 'Enter your 4 digit PIN to continue' }: LoginProps) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (Number.isNaN(Number(value))) return;

    const newPin = [...pin];
    newPin[index] = value.substring(value.length - 1);
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every(digit => digit !== '')) {
      handleVerify(newPin.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (code: string) => {
    setLoading(true);

    setTimeout(() => {
      if (code === accessPin) {
        onLogin();
      } else {
        setError(true);
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
      }
    }, 700);
  };

  return (
    <div className="login-screen-immersion">
      <img
        className="login-frame-logo"
        src={logoImage}
        alt="Canary Vision"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />

      <div className="login-visual">
        <video
          src={introVideo}
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>

      <div className="login-content login-right">
        <header className="login-brand">
          <div>
            <img className="login-brand-logo" src={swarnamLogo} alt="Swarnam Group" />
          </div>
        </header>

        <div className={`login-terminal ${error ? 'shake' : ''}`}>
          <div className="terminal-header">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <div className="pin-input-grid">
            {pin.map((digit, index) => (
              <div key={index} className={`pin-field ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  onChange={(e) => handleChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  autoFocus={index === 0}
                  disabled={loading}
                  aria-label={`PIN digit ${index + 1}`}
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="error-message">
              <Lock size={12} /> Incorrect PIN. Try again.
            </div>
          )}

          <div className="security-note">
            <Lock size={10} color="#161A1D" />
            Secured connection
          </div>
        </div>

        <footer className="login-powered">
          <span>POWERED BY</span>
          <img src={Logo} alt="Canary Digital.ai" />
        </footer>
      </div>
    </div>
  );
};

export default Login;
