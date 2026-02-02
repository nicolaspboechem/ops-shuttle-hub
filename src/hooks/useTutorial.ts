import { useState, useEffect, useCallback, useMemo } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface UseTutorialReturn {
  isActive: boolean;
  currentStep: TutorialStep | null;
  currentIndex: number;
  totalSteps: number;
  next: () => void;
  skip: () => void;
  complete: () => void;
  reset: () => void;
}

export type TutorialRole = 'motorista' | 'operador' | 'supervisor' | 'cliente';

export function useTutorial(
  role: TutorialRole,
  steps: TutorialStep[]
): UseTutorialReturn {
  const storageKey = `tutorial_${role}_seen`;
  
  const [hasSeen, setHasSeen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(storageKey) === 'true';
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const markAsSeen = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setHasSeen(true);
  }, [storageKey]);

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasSeen(false);
    setCurrentIndex(0);
  }, [storageKey]);

  const next = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      markAsSeen();
    }
  }, [currentIndex, steps.length, markAsSeen]);

  const skip = useCallback(() => {
    markAsSeen();
  }, [markAsSeen]);

  const complete = useCallback(() => {
    markAsSeen();
  }, [markAsSeen]);

  const isActive = !hasSeen && steps.length > 0;
  
  const currentStep = useMemo(() => {
    if (!isActive) return null;
    return steps[currentIndex] || null;
  }, [isActive, steps, currentIndex]);

  return {
    isActive,
    currentStep,
    currentIndex,
    totalSteps: steps.length,
    next,
    skip,
    complete,
    reset,
  };
}

// Pre-defined tutorial steps for each role
export const motoristaSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao App Motorista! 👋',
    description: 'Aqui você verá suas missões e viagens designadas. Vamos fazer um tour rápido.',
    position: 'center',
  },
  {
    id: 'checkin',
    title: 'Check-in Diário',
    description: 'Faça seu check-in para começar a receber viagens. Toque no card para fazer check-in.',
    targetSelector: '[data-tutorial="checkin"]',
    position: 'bottom',
  },
  {
    id: 'viagens',
    title: 'Suas Viagens',
    description: 'Deslize para a direita para iniciar uma viagem rapidamente, ou use os botões.',
    targetSelector: '[data-tutorial="viagem-card"]',
    position: 'bottom',
  },
  {
    id: 'nav',
    title: 'Navegação',
    description: 'Use a barra inferior para acessar Veículo, criar Corrida e ver Histórico.',
    targetSelector: 'nav',
    position: 'top',
  },
];

export const operadorSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Painel do Operador 📋',
    description: 'Gerencie viagens e motoristas com facilidade. Vamos conhecer as funcionalidades.',
    position: 'center',
  },
  {
    id: 'stats',
    title: 'Filtros Rápidos',
    description: 'Toque nos cards de status para filtrar as viagens por situação.',
    targetSelector: '[data-tutorial="stats"]',
    position: 'bottom',
  },
  {
    id: 'swipe',
    title: 'Ações Rápidas',
    description: 'Deslize os cards para realizar ações como iniciar ou finalizar viagens.',
    position: 'center',
  },
  {
    id: 'nova',
    title: 'Criar Viagem',
    description: 'Toque no botão central (+) para criar uma nova viagem rapidamente.',
    targetSelector: '[data-tutorial="nova-btn"]',
    position: 'top',
  },
];

export const supervisorSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Painel do Supervisor 🛡️',
    description: 'Gerencie frota, viagens e localização da equipe. Vamos explorar.',
    position: 'center',
  },
  {
    id: 'stats',
    title: 'Filtros Inteligentes',
    description: 'Toque nos cards de status para filtrar motoristas ou veículos rapidamente.',
    targetSelector: '[data-tutorial="stats"]',
    position: 'bottom',
  },
  {
    id: 'swipe',
    title: 'Ações por Deslize',
    description: 'Deslize os cards para vincular veículos, editar localização e muito mais.',
    position: 'center',
  },
  {
    id: 'nova',
    title: 'Criar Viagem',
    description: 'Use o botão central para criar viagens quando necessário.',
    targetSelector: '[data-tutorial="nova-btn"]',
    position: 'top',
  },
];

export const clienteSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo! 👋',
    description: 'Acompanhe as operações em tempo real através deste painel.',
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Veja métricas e estatísticas em tempo real das operações.',
    targetSelector: '[data-tutorial="dashboard"]',
    position: 'bottom',
  },
  {
    id: 'nav',
    title: 'Navegação',
    description: 'Use a barra inferior para alternar entre Dashboard, Localizador e Painel.',
    targetSelector: 'nav',
    position: 'top',
  },
];
