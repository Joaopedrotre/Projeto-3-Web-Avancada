// =====================================================================
// PONTO DE ENTRADA DA APLICAÇÃO
// =====================================================================

import type { Categoria, RespostaApi } from './types.js';
import { inicializarDashboard } from './dashboard.js';
import { definirCategorias, inicializarTelaProdutos } from './produtos.js';

async function carregarCategorias(): Promise<Categoria[]> {
    try {
        const resposta = await fetch('/auto-nobre/backend/api/categorias.php');
        const corpo: unknown = await resposta.json();

        if (typeof corpo !== 'object' || corpo === null || !('dados' in corpo)) {
            return [];
        }

        const respostaTipada = corpo as RespostaApi<Categoria[]>;
        return respostaTipada.dados ?? [];
    } catch {
        return [];
    }
}

async function iniciar(): Promise<void> {
    const categorias = await carregarCategorias();
    definirCategorias(categorias);

    await inicializarDashboard();
    await inicializarTelaProdutos();
}

document.addEventListener('DOMContentLoaded', () => {
    void iniciar();
});
