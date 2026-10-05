'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from './settings-context';

export function NetworkModal() {
  const { isNetworkModalOpen, setIsNetworkModalOpen, t } = useSettings();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    local: string;
    network: string | null;
    networkAddresses: string[];
    qrDataUrl: string | null;
    hasNetwork: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isNetworkModalOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCopied(false);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    fetch(`/api/system/network?path=${encodeURIComponent(currentPath)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível obter dados de rede');
        return res.json();
      })
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isNetworkModalOpen]);

  if (!isNetworkModalOpen) return null;

  const handleCopy = () => {
    if (data?.network) {
      navigator.clipboard.writeText(data.network).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-[#111] border border-[#333] max-w-md w-full max-h-[90vh] sm:max-h-[85vh] my-auto flex flex-col text-sm overflow-hidden shadow-2xl">
        {/* Cabeçalho */}
        <div className="p-3.5 sm:p-5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
          <div className="flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-gray-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" strokeWidth="2" />
              <path d="M12 18h.01" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <h2 className="text-sm font-bold font-mono text-white">
                {t('networkModalTitle')}
              </h2>
              <p className="text-xs text-[#777] font-mono mt-0.5">
                {t('networkModalDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNetworkModalOpen(false)}
            className="text-[#888] hover:text-white font-mono text-sm px-2 py-1"
            title={t('close')}
          >
            ✕
          </button>
        </div>

        {/* Corpo com scroll interno */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {loading ? (
            <div className="text-center py-12 text-[#666] font-mono text-xs">
              {t('loading')}
            </div>
          ) : error ? (
            <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono">
              {error}
            </div>
          ) : data?.hasNetwork && data.network ? (
            <div className="flex flex-col items-center gap-4 text-center">
              {/* QR Code */}
              {data.qrDataUrl && (
                <div className="p-3 bg-white rounded-md shadow-lg flex flex-col items-center">
                  <img
                    src={data.qrDataUrl}
                    alt="QR Code para acesso no celular"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                </div>
              )}

              <p className="text-xs text-[#aaa]">
                {t('scanQrCode')}
              </p>

              {/* Caixa do Link */}
              <div className="w-full flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-mono text-[#777]">
                  {t('networkUrlLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={data.network}
                    className="input text-xs font-mono py-1.5 px-2.5 bg-[#0a0a0a] text-white border-[#333] select-all cursor-text flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`btn text-xs px-3 py-1.5 shrink-0 transition-colors ${
                      copied ? 'bg-emerald-600 text-white border-emerald-500' : 'btn-primary'
                    }`}
                  >
                    {copied ? t('copied') : t('copyUrl')}
                  </button>
                </div>
              </div>

              {/* Dica de Wi-Fi */}
              <div className="w-full p-2.5 bg-[#141414] border border-[#262626] rounded-sm text-left flex items-start gap-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-[#222] text-[#888] shrink-0 font-bold">INFO</span>
                <p className="text-[11px] text-[#888] leading-relaxed">
                  {t('wifiTip')}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 flex flex-col items-center gap-3">
              <div className="w-10 h-10 border border-[#333] rounded-full flex items-center justify-center text-gray-500 font-mono text-sm font-bold">
                !
              </div>
              <h3 className="text-sm font-bold text-white font-mono">
                {t('noNetworkTitle')}
              </h3>
              <p className="text-xs text-[#888] max-w-xs">
                {t('noNetworkDesc')}
              </p>
              <div className="w-full mt-2 p-3 bg-[#141414] border border-[#262626] text-left">
                <span className="text-[10px] text-[#666] font-mono block mb-1">
                  Acesso local neste computador:
                </span>
                <code className="text-xs font-mono text-gray-300">
                  {data?.local || 'http://localhost:3333'}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé fixo */}
        <div className="p-3.5 sm:p-4 border-t border-[#222] flex items-center justify-end shrink-0 bg-[#0d0d0d]">
          <button
            type="button"
            onClick={() => setIsNetworkModalOpen(false)}
            className="btn text-xs"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
