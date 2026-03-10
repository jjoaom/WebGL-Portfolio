import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Hud() {
  const { t, i18n } = useTranslation('ui');

  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'pt';
  const isEnglish = currentLanguage.startsWith('en');

  const toggleLanguage = () => {
    const newLang = isEnglish ? 'pt' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // IMPORTANTE: Deixa o clique vazar para o 3D
        zIndex: 9999, // Fica acima de tudo
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* --- MIRA CENTRAL (Crosshair) --- */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '6px',
        height: '6px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '50%',
        boxShadow: '0 0 4px rgba(0,0,0,0.5)'
      }} />

      {/* --- TOPO: Seletor de Idioma --- */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={toggleLanguage}
          style={{
            pointerEvents: 'auto', // IMPORTANTE: Reativa o clique só no botão
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            fontWeight: 'bold'
          }}
        >
          {isEnglish ? t('hud.languageSwitch.pt') : t('hud.languageSwitch.en')}
        </button>
      </div>

      {/* --- RODAPÉ: Instruções --- */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '12px',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          gap: '15px',
          fontSize: '14px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span><strong>WASD</strong> {t('hud.controls.move')}</span>
          <span><strong>Mouse</strong> {t('hud.controls.look')}</span>
          <span><strong>Click</strong> {t('hud.controls.interact')}</span>
          <span><strong>ESC</strong> {t('hud.controls.exit')}</span>
        </div>
      </div>
    </div>
  );
}