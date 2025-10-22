// ============================================
// PRICE CALCULATOR - Motor de Cálculo de Preços
// ============================================

class PriceCalculator {
    constructor(eventConfig) {
        this.config = eventConfig;
        this.participants = [];
        this.cupomAplicado = null;
        this.formaPagamentoSelecionada = null;
    }

    // ========== CÁLCULO DE IDADE ==========
    calcularIdade(dataNascimento) {
        if (!dataNascimento) return null;
        
        const hoje = new Date();
        const nascimento = new Date(dataNascimento + 'T00:00:00');
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        
            idade--;
        }
        
        return idade;
    }

    // ========== APLICAR REGRAS DE IDADE ==========
    aplicarRegraIdade(idade, tipo, contadorGratuidade) {
        if (!this.config.regras_idade_precificacao.habilitado) {
            return { percentual: 1.0, descricao: 'Valor integral', gratuito: false };
        }
        
        
        for (const regra of regras) {
            const min = regra.faixa_min_anos;
            
            if (idade >= min && idade <= max) {
                // Verificar gratuidade
                if (regra.percentual_valor_adulto === 0) {
                    if (regra.limite_gratuidade_por_reserva && 
                        contadorGratuidade < regra.limite_gratuidade_por_reserva) {
                        return {
                            percentual: 0,
                            gratuito: true,
                            incrementar_contador: true
                        };
                    } else if (regra.regra_excedente_gratuito) {
                        return {
                            percentual: regra.regra_excedente_gratuito.percentual_valor_adulto,
                            descricao: regra.regra_excedente_gratuito.descricao,
                            gratuito: false
                        };
                    }
                }
                
                return {
                    percentual: regra.percentual_valor_adulto,
                    gratuito: false
                };
            }
        }
        
        // Padrão: valor integral
        return { percentual: 1.0, descricao: 'Valor integral', gratuito: false };
    }

    // ========== CALCULAR VALOR PARTICIPANTE ==========
    calcularValorParticipante(participante, contadorGratuidadeHospedagem, contadorGratuidadeEvento) {
        const idade = this.calcularIdade(participante.data_nascimento);
        
        let valorHospedagem = 0;
        let valorEvento = 0;
        let detalhesHospedagem = null;
        let detalhesEvento = null;
        
        // HOSPEDAGEM
        if (participante.periodo_estadia && participante.acomodacao) {
            const periodo = this.config.modalidades.periodos_estadia.find(p => p.id === participante.periodo_estadia);
            const acomodacao = this.config.modalidades.acomodacoes.find(a => a.id === participante.acomodacao);
            
            if (periodo && acomodacao) {
                
                if (idade !== null) {
                    const regra = this.aplicarRegraIdade(idade, 'hospedagem', contadorGratuidadeHospedagem);
                    valorHospedagem = valorBase * regra.percentual;
                    detalhesHospedagem = {
                        valor_base: valorBase,
                        percentual: regra.percentual,
                        descricao: regra.descricao,
                        gratuito: regra.gratuito
                    };
                    
                    if (regra.incrementar_contador) {
                        contadorGratuidadeHospedagem++;
                    }
                } else {
                    valorHospedagem = valorBase;
                    detalhesHospedagem = {
                        valor_base: valorBase,
                        percentual: 1.0,
                        descricao: 'Valor integral',
                        gratuito: false
                    };
                }
            }
        }
        
        // EVENTO
        if (participante.opcao_evento) {
            const opcaoEvento = this.config.modalidades.opcoes.find(o => o.id === participante.opcao_evento);
            
            if (opcaoEvento && !opcaoEvento.gratuito) {
                const valorBase = opcaoEvento.valor;
                
                if (idade !== null) {
                    const regra = this.aplicarRegraIdade(idade, 'evento', contadorGratuidadeEvento);
                    valorEvento = valorBase * regra.percentual;
                    detalhesEvento = {
                        valor_base: valorBase,
                        percentual: regra.percentual,
                        descricao: regra.descricao,
                        gratuito: regra.gratuito
                    };
                    
                    if (regra.incrementar_contador) {
                        contadorGratuidadeEvento++;
                    }
                } else {
                    valorEvento = valorBase;
                    detalhesEvento = {
                        valor_base: valorBase,
                        percentual: 1.0,
                        descricao: 'Valor integral',
                        gratuito: false
                    };
                }
            }
        }
        
        return {
            valorHospedagem,
            valorEvento,
            valorTotal: valorHospedagem + valorEvento,
            detalhesHospedagem,
            detalhesEvento,
            idade,
            contadorGratuidadeHospedagem,
            contadorGratuidadeEvento
        };
    }

    // ========== CALCULAR TOTAL GERAL ==========
    calcularTotalGeral(participantes) {
        let totalHospedagem = 0;
        let totalEvento = 0;
        let contadorGratuidadeHospedagem = 0;
        let contadorGratuidadeEvento = 0;
        
        const detalhesParticipantes = [];
        
        participantes.forEach(participante => {
            const calculo = this.calcularValorParticipante(
                participante,
                contadorGratuidadeHospedagem,
                contadorGratuidadeEvento
            );
            
            totalHospedagem += calculo.valorHospedagem;
            totalEvento += calculo.valorEvento;
            contadorGratuidadeHospedagem = calculo.contadorGratuidadeHospedagem;
            contadorGratuidadeEvento = calculo.contadorGratuidadeEvento;
            
            detalhesParticipantes.push({
                nome: participante.nome_completo,
                idade: calculo.idade,
                valorHospedagem: calculo.valorHospedagem,
                valorEvento: calculo.valorEvento,
                valorTotal: calculo.valorTotal,
                detalhesHospedagem: calculo.detalhesHospedagem,
                detalhesEvento: calculo.detalhesEvento
            });
        });
        
        const subtotal = totalHospedagem + totalEvento;
        
        return {
            totalHospedagem,
            totalEvento,
            subtotal,
            detalhesParticipantes
        };
    }

    // ========== VALIDAR E APLICAR CUPOM ==========
    validarCupom(codigoCupom, subtotal) {
        if (!this.config.cupons_desconto.habilitado) {
            return { valido: false, erro: 'Sistema de cupons desabilitado' };
        }
        
        const cupom = this.config.cupons_desconto.cupons.find(
            c => c.codigo.toUpperCase() === codigoCupom.toUpperCase() && c.ativo
        );
        
        if (!cupom) {
            return { valido: false, erro: 'Cupom inválido ou expirado' };
        }
        
        // Validar data
        const agora = new Date();
        const dataInicio = new Date(cupom.data_validade_inicio);
        const dataFim = new Date(cupom.data_validade_fim);
        
            return { valido: false, erro: 'Cupom fora do período de validade' };
        }
        
        // Calcular desconto
        let valorDesconto = 0;
        
        if (cupom.tipo_desconto === 'percentual') {
            valorDesconto = subtotal * cupom.valor_desconto;
        } else if (cupom.tipo_desconto === 'fixo') {
            valorDesconto = cupom.valor_desconto;
        }
        
        // Não permitir desconto maior que o subtotal
        valorDesconto = Math.min(valorDesconto, subtotal);
        
        this.cupomAplicado = {
            codigo: cupom.codigo,
            descricao: cupom.descricao,
            valorDesconto,
            aplicacao: cupom.aplicacao
        };
        
        return {
            valido: true,
            cupom: this.cupomAplicado
        };
    }

    // ========== CALCULAR TAXA DE GATEWAY ==========
    calcularTaxaGateway(valorTotal) {
        if (!this.formaPagamentoSelecionada) return 0;
        
        const formaPagamento = this.config.pagamento.formas_pagamento_opcoes.find(
            f => f.id === this.formaPagamentoSelecionada
        );
        
        if (!formaPagamento) return 0;
        
    }

    // ========== CALCULAR DESCONTO FORMA DE PAGAMENTO ==========
    calcularDescontoFormaPagamento(valorTotal) {
        if (!this.formaPagamentoSelecionada) return 0;
        
        const formaPagamento = this.config.pagamento.formas_pagamento_opcoes.find(
            f => f.id === this.formaPagamentoSelecionada
        );
        
        
        return valorTotal * formaPagamento.desconto_percentual;
    }

    // ========== CALCULAR TOTAL FINAL ==========
    calcularTotalFinal(participantes, formaPagamentoId = null) {
        this.formaPagamentoSelecionada = formaPagamentoId;
        
        const totais = this.calcularTotalGeral(participantes);
        let { subtotal } = totais;
        
        // Aplicar desconto de cupom
        let valorDesconto = 0;
        if (this.cupomAplicado) {
            valorDesconto = this.cupomAplicado.valorDesconto;
        }
        
        // Aplicar desconto de forma de pagamento
        const descontoFormaPagamento = this.calcularDescontoFormaPagamento(subtotal);
        
        // Subtotal após descontos
        const subtotalComDescontos = subtotal - valorDesconto - descontoFormaPagamento;
        
        // Taxa de gateway
        const taxaGateway = this.calcularTaxaGateway(subtotalComDescontos);
        
        // Total final
        const totalFinal = subtotalComDescontos + taxaGateway;
        
        return {
            ...totais,
            valorDesconto,
            descontoFormaPagamento,
            taxaGateway,
            totalFinal,
            cupomAplicado: this.cupomAplicado
        };
    }

    // ========== FORMATAR MOEDA ==========
    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
        }).format(valor);
    }
}

// Instância global
let priceCalculator = null;

function initializePriceCalculator(eventConfig) {
    priceCalculator = new PriceCalculator(eventConfig);
    console.log('💰 Calculadora de preços inicializada');
}
