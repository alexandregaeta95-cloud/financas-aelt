import { useState, useEffect, useCallback } from 'react';
import { PixTransaction } from '../types';
import { PixNotificationService } from '../services/pixNotificationService';
import { PixHistoryService } from '../history/pixHistoryService';
import { obterPixSettings } from '../components/PixSettingsView';

export function usePix(onConfirmarLancamento?: (payload: any) => void) {
  const [activePix, setActivePix] = useState<PixTransaction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);

  const iniciar = useCallback(() => {
    PixNotificationService.iniciarMonitoramento();
    setIsMonitoring(true);
  }, []);

  const parar = useCallback(() => {
    PixNotificationService.pararMonitoramento();
    setIsMonitoring(false);
  }, []);

  const abrirDialog = useCallback((pix: PixTransaction) => {
    setActivePix(pix);
    setIsDialogOpen(true);
  }, []);

  const cancelar = useCallback(() => {
    if (activePix) {
      PixHistoryService.registrarHistorico({
        id: `hist-${Date.now()}`,
        dataHora: new Date().toISOString(),
        banco: activePix.banco,
        valor: activePix.valor,
        textoRecebido: activePix.textoOriginal,
        resultadoInterpretacao: activePix,
        status: 'IGNORADO',
        observacoes: 'Notificação ignorada pelo usuário'
      });
    }
    setActivePix(null);
    setIsDialogOpen(false);
  }, [activePix]);

  const confirmar = useCallback((
    opcao: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA' | 'IGNORAR',
    payload?: any
  ) => {
    if (opcao === 'IGNORAR' || !activePix) {
      cancelar();
      return;
    }

    // Register history as CONFIRMADO
    PixHistoryService.registrarHistorico({
      id: `hist-${Date.now()}`,
      dataHora: new Date().toISOString(),
      banco: activePix.banco,
      valor: activePix.valor,
      textoRecebido: activePix.textoOriginal,
      resultadoInterpretacao: activePix,
      status: 'CONFIRMADO',
      observacoes: `Confirmado como ${opcao}`
    });

    if (onConfirmarLancamento && payload) {
      onConfirmarLancamento(payload);
    }

    setActivePix(null);
    setIsDialogOpen(false);
  }, [activePix, cancelar, onConfirmarLancamento]);

  const processar = useCallback((textoNotificacao: string, pacote?: string) => {
    const pix = PixNotificationService.detectarNotificacao({
      id: `notif-${Date.now()}`,
      appPacote: pacote,
      titulo: 'Notificação de Banco',
      texto: textoNotificacao,
      dataHora: new Date().toISOString()
    });

    if (pix && pix.status !== 'DUPLICADO') {
      const settings = obterPixSettings();
      if (settings.mostrarConfirmacao) {
        abrirDialog(pix);
      } else {
        // Direct auto-fill without dialog
        confirmar('RECEITA', {
          valor: pix.valor,
          tipo: pix.tipo === 'ENVIADO' ? 'DESPESA' : 'RECEITA',
          categoria: pix.categoriaSugerida || 'TRABALHO',
          descricao: `PIX - ${pix.nomePessoa || pix.banco}`,
          bancoNome: pix.banco,
          formaPagamento: 'PIX',
          origem: 'PIX',
          statusProcessamento: 'PENDENTE',
          data: pix.data,
          hora: pix.hora
        });
      }
    }
    return pix;
  }, [abrirDialog, confirmar]);

  useEffect(() => {
    iniciar();
    const unsubscribe = PixNotificationService.onPixDetectado((pix) => {
      const settings = obterPixSettings();
      if (settings.mostrarConfirmacao) {
        abrirDialog(pix);
      }
    });

    return () => {
      unsubscribe();
      parar();
    };
  }, [iniciar, parar, abrirDialog]);

  return {
    isMonitoring,
    isDialogOpen,
    activePix,
    iniciar,
    parar,
    processar,
    abrirDialog,
    confirmar,
    cancelar
  };
}

export default usePix;
