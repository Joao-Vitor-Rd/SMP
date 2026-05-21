"use client";

import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Bell, 
  Folder, 
  Upload, 
  Maximize, 
  FileText, 
  Map as MapIcon, 
  History, 
  User, 
  LogOut, 
  AlertCircle,
  MapPin,
  ImageIcon,
  CheckCircle2,
  Navigation,
  AlertTriangle,
  ArrowRight,
  ArrowUpCircle
} from 'lucide-react';

type PriorityLevel = 'Alta' | 'Média' | 'Baixa';

interface ImageMetadataTask {
  id: string;
  fileName: string;
  uploadDate: string;
  prioridade: PriorityLevel;
}

export default function MetadadosPendentes() {
  const [tasks, setTasks] = useState<ImageMetadataTask[]>([
    { id: '1', fileName: 'IMG_20240510_1420.jpg', uploadDate: '10/05/2026', prioridade: 'Média' },
    { id: '2', fileName: 'IMG_20240510_1421.jpg', uploadDate: '10/05/2026', prioridade: 'Alta' },
    { id: '3', fileName: 'IMG_20240510_1422.jpg', uploadDate: '10/05/2026', prioridade: 'Baixa' },
  ]);
  
  const [selectedTask, setSelectedTask] = useState<ImageMetadataTask | null>(null);
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [showSuccess, setShowSuccess] = useState(false);

  const priorityWeight = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };

  const orderedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => priorityWeight[b.prioridade] - priorityWeight[a.prioridade]);
  }, [tasks]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
    
    setTimeout(() => {
      const updatedTasks = tasks.filter(t => t.id !== selectedTask?.id);
      setTasks(updatedTasks);
      
      const nextOrderedTasks = updatedTasks.sort((a, b) => priorityWeight[b.prioridade] - priorityWeight[a.prioridade]);
      
      if (nextOrderedTasks.length > 0) {
        setSelectedTask(nextOrderedTasks[0]);
      } else {
        setSelectedTask(null);
      }
      
      setCoords({ lat: '', lng: '' });
      setShowSuccess(false);
    }, 1200);
  };

  const getPriorityBadgeColor = (priority: PriorityLevel) => {
    if (priority === 'Alta') return 'bg-red-50 text-red-700 border-red-200';
    if (priority === 'Média') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const getPriorityIconColor = (priority: PriorityLevel) => {
    if (priority === 'Alta') return 'text-red-500';
    if (priority === 'Média') return 'text-amber-500';
    return 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <aside className="w-20 bg-[#1e2235] flex flex-col items-center py-6 shrink-0 min-h-screen border-r border-gray-800">
        <div className="p-3 bg-[#0a5483] rounded-xl text-white mb-10">
          <Activity size={26} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-9 items-center w-full mb-auto">
          <Folder className="text-gray-400 hover:text-white cursor-pointer" size={22} />
          <Upload className="text-gray-400 hover:text-white cursor-pointer" size={22} />
          <Maximize className="text-gray-400 hover:text-white cursor-pointer" size={22} />
          <FileText className="text-gray-400 hover:text-white cursor-pointer" size={22} />
          <MapIcon className="text-gray-400 hover:text-white cursor-pointer" size={22} />
          <History className="text-gray-400 hover:text-white cursor-pointer" size={22} />
        </div>
        <div className="relative pb-4">
          <Bell size={26} className="text-white" strokeWidth={1.5} />
          {tasks.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#1e2235]">
              {tasks.length}
            </span>
          )}
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-xl font-bold text-gray-800">RoadSense AI</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Correção de Metadados Geográficos</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-xl border border-gray-200">
              <div className="text-right text-sm">
                <p className="font-bold text-gray-900">Douglas Teófilo</p>
                <p className="text-xs text-gray-500 font-medium">Engenheiro</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                <User size={20} />
              </div>
            </div>
            <button className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm font-bold">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto space-y-6">
          {tasks.length > 0 ? (
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 flex items-start gap-3 text-amber-900 shadow-sm transition-all">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-sm">Ação necessária</p>
                <p className="text-xs text-amber-700 mt-0.5 font-medium">
                  ⚠️ Ainda existem imagens pendentes de localização. Trate todas as imagens antes de prosseguir para a revisão geral.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-r-xl p-4 flex items-start gap-3 text-green-950 shadow-sm transition-all">
              <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-sm">Tudo pronto!</p>
                <p className="text-xs text-green-700 mt-0.5 font-medium">
                  Todas as imagens foram localizadas com sucesso. O avanço para a revisão geral está liberado.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-gray-700">
                    <ImageIcon size={20} className="text-gray-500" />
                    <h2 className="font-bold text-sm uppercase tracking-wider">Fila por Prioridade</h2>
                  </div>
                  {tasks.length > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
                      {tasks.length} restante{tasks.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3">
                  {orderedTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                      <p className="text-xs font-bold text-gray-500">Nenhuma pendência</p>
                    </div>
                  ) : (
                    orderedTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedTask?.id === task.id 
                          ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 shadow-sm' 
                          : 'border-gray-100 hover:border-gray-300 bg-gray-50/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${selectedTask?.id === task.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <ImageIcon size={16} />
                          </div>
                          <div className="truncate flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{task.fileName}</p>
                            <p className="text-[10px] text-gray-500 mb-2">Enviado em {task.uploadDate}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPriorityBadgeColor(task.prioridade)}`}>
                              <ArrowUpCircle size={10} className={getPriorityIconColor(task.prioridade)} />
                              {task.prioridade}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedTask ? (
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-[#0a3d62] p-6 text-white flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold">Informar Coordenadas Manuais</h2>
                      <p className="text-blue-200 text-xs mt-0.5 truncate max-w-md">{selectedTask.fileName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border bg-white/10 border-white/20`}>
                        Prioridade {selectedTask.prioridade}
                      </span>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full uppercase font-bold tracking-widest">US-11</span>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="aspect-video bg-gray-900 rounded-xl mb-8 flex items-center justify-center border border-gray-800 relative overflow-hidden group shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 z-0">
                          <ImageIcon size={48} strokeWidth={1} className="text-gray-700" />
                          <p className="text-xs mt-2 font-medium text-gray-600">Imagem do Ponto do Pavimento</p>
                      </div>
                    </div>

                    {showSuccess ? (
                      <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                        <CheckCircle2 size={32} className="text-green-600" />
                        <div>
                          <p className="font-bold">Coordenadas vinculadas!</p>
                          <p className="text-sm text-green-600/90">Reordenando fila por criticidade...</p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                              <Navigation size={14} className="text-gray-500" /> Latitude
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: -3.7899"
                              value={coords.lat}
                              onChange={(e) => setCoords({...coords, lat: e.target.value})}
                              className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                              <Navigation size={14} className="text-gray-500" /> Longitude
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: -38.5243"
                              value={coords.lng}
                              onChange={(e) => setCoords({...coords, lng: e.target.value})}
                              className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-gray-100">
                          <button 
                            type="submit"
                            className="flex-1 bg-[#003e68] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-[#002d4d] transition-all flex items-center justify-center gap-2"
                          >
                            <MapPin size={18} /> Salvar Localização
                          </button>
                          <button 
                            type="button"
                            onClick={() => setSelectedTask(null)}
                            className="px-8 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 border border-gray-300 transition-all"
                          >
                            Voltar
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-between min-h-[460px] shadow-sm">
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center">
                    {tasks.length > 0 ? (
                      <>
                        <div className="bg-amber-50 p-6 rounded-full mb-4">
                            <AlertCircle size={40} className="text-amber-500" />
                        </div>
                        <h3 className="font-bold text-gray-700">Aguardando Resolução</h3>
                        <p className="text-sm max-w-xs mt-2 text-gray-500">Selecione uma imagem na lista lateral esquerda para inserir os dados de geolocalização faltantes.</p>
                      </>
                    ) : (
                      <>
                        <div className="bg-green-50 p-6 rounded-full mb-4">
                            <CheckCircle2 size={40} className="text-green-500" />
                        </div>
                        <h3 className="font-bold text-gray-800">Processo Concluído</h3>
                        <p className="text-sm max-w-xs mt-2 text-gray-500">Normas DNIT atendidas. Não restam inconformidades de metadados nesta seção.</p>
                      </>
                    )}
                  </div>
                  
                  <div className="w-full border-t border-gray-100 pt-6 mt-6">
                    <button
                      type="button"
                      disabled={tasks.length > 0}
                      className={`w-full py-4 rounded-xl font-bold text-sm transition-all text-center flex items-center justify-center gap-2 ${
                        tasks.length > 0 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" 
                        : "bg-green-600 text-white hover:bg-green-700 shadow-md cursor-pointer"
                      }`}
                    >
                      {tasks.length > 0 ? (
                        <>
                          <AlertTriangle size={16} className="text-amber-500" />
                          Resolva as pendências para obrigação ({tasks.length} restantes)
                        </>
                      ) : (
                        <>
                          Prosseguir para Revisão Geral
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}