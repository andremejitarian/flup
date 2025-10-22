// ============================================
// PRICE CALCULATOR - Sistema de Cálculo Dinâmico
// ============================================

class PriceCalculator {
    constructor(eventConfig) {
        this.config = eventConfig;
        this.participants = [];
        this.appliedCoupon = null;
        this.selectedPaymentMethod = null;
        
        // Verificar se pagamento está habilitado
        
        console.log('💰 Calculador de preços inicializado', {
            paymentEnabled: this.paymentEnabled,
            ageRulesEnabled: this.ageRulesEnabled
        });
    }

    // ========== CÁLCULO DE IDADE ==========
    calculateAge(birthDate) {
        if (!birthDate) return null;
        
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
            age--;
        }
        
        return age;
    }

    // ========== REGRAS DE IDADE ==========
    getAgeRule(age, type) {
            return { percentual_valor_adulto: 1.0 };
        }
        
        
        for (let rule of rules) {
            const minAge = rule.faixa_min_anos;
            const maxAge = rule.faixa_max_anos !== undefined ? rule.faixa_max_anos : Infinity;
            
            if (age >= minAge && age <= maxAge) {
                return rule;
            }
        }
        
        // Se não encontrar regra específica, retorna valor integral
        return { percentual_valor_adulto: 1.0 };
    }

    // Obter participantes elegíveis para gratuidade ordenados
    getEligibleFreeParticipants(type) {
        const eligibleParticipants = [];
        
        this.participants.forEach((participant, index) => {
            if (!participant.birthDate) return;
            
            const age = this.calculateAge(participant.birthDate);
            if (age === null) return;
            
            const ageRule = this.getAgeRule(age, type);
            
            // Verificar se está na faixa de gratuidade
            if (ageRule.percentual_valor_adulto === 0 && ageRule.limite_gratuidade_por_reserva) {
                const minAge = ageRule.faixa_min_anos;
                const maxAge = ageRule.faixa_max_anos !== undefined ? ageRule.faixa_max_anos : Infinity;
                
                if (age >= minAge && age <= maxAge) {
                    eligibleParticipants.push({
                        participant,
                        index,
                        age,
                        ageRule
                    });
                }
            }
        });
        
        // Ordenar por ordem de inserção (primeiro a ser inserido tem prioridade)
        return eligibleParticipants.sort((a, b) => a.index - b.index);
    }

    // Verificar se participante específico é elegível para gratuidade
    isEligibleForFree(participantData, type) {
        
        const age = this.calculateAge(participantData.birthDate);
        if (age === null) return false;
        
        const ageRule = this.getAgeRule(age, type);
        
            return false;
        }
        
        // Obter todos os participantes elegíveis para gratuidade
        const eligibleParticipants = this.getEligibleFreeParticipants(type);
        
        // Encontrar a posição deste participante na lista ordenada
        const participantIndex = eligibleParticipants.findIndex(ep => 
            ep.participant.id === participantData.id
        );
        
        if (participantIndex === -1) return false;
        
        // Verificar se está dentro do limite de gratuidade
        return participantIndex < ageRule.limite_gratuidade_por_reserva;
    }

    // Verificar se deve aplicar regra de excedente
    shouldApplyExcessRule(participantData, type) {
        
        const age = this.calculateAge(participantData.birthDate);
        if (age === null) return false;
        
        const ageRule = this.getAgeRule(age, type);
        
        // Verificar se tem regra de excedente e se está na faixa de idade original
            return false;
        }
        
        // Obter todos os participantes elegíveis para gratuidade
        const eligibleParticipants = this.getEligibleFreeParticipants(type);
        
        // Encontrar a posição deste participante na lista ordenada
        const participantIndex = eligibleParticipants.findIndex(ep => 
            ep.participant.id === participantData.id
        );
        
        if (participantIndex === -1) return false;
        
        // Verificar se está FORA do limite de gratuidade (excedente)
        return participantIndex >= ageRule.limite_gratuidade_por_reserva;
    }

    // ========== CÁLCULO DE HOSPEDAGEM ==========
    calculateLodgingValue(participantData) {
            return 0;
        }

        const periodo = this.config.periodos_estadia_opcoes?.find(p => p.id === participantData.stayPeriod);
        const acomodacao = this.config.tipos_acomodacao?.find(a => a.id === participantData.accommodation);
        

        const baseValue = acomodacao.valor_diaria_por_pessoa * periodo.num_diarias;
        
        // Se não tem data de nascimento ou regras de idade desabilitadas, retorna valor base
            return this.applyGatewayFee(baseValue);
        }
        
        const age = this.calculateAge(participantData.birthDate);
        if (age === null) {
            return this.applyGatewayFee(baseValue);
        }
        
        const ageRule = this.getAgeRule(age, 'hospedagem');
        
        // Verificar gratuidade primeiro
        if (this.isEligibleForFree(participantData, 'hospedagem')) {
            return 0;
        }
        
        // Verificar regra de excedente
        if (this.shouldApplyExcessRule(participantData, 'hospedagem')) {
            const finalValue = baseValue * ageRule.regra_excedente_gratuito.percentual_valor_adulto;
            return this.applyGatewayFee(finalValue);
        }

        // Aplicar percentual normal da regra de idade
        const finalValue = baseValue * ageRule.percentual_valor_adulto;
        return this.applyGatewayFee(finalValue);
    }

    // ========== CÁLCULO DE EVENTO ==========
    calculateEventValue(participantData) {
        if (!participantData.eventOption) {
            return 0;
        }

        let eventOption = null;

        // Buscar opção de evento baseada no tipo de formulário
        if (this.config.modalidades.tipo_formulario === 'evento_apenas') {
            eventOption = this.config.valores_evento_opcoes?.find(e => e.id === participantData.eventOption);
        } else if (this.config.modalidades.tipo_formulario === 'hospedagem_e_evento' && participantData.stayPeriod) {
            const periodo = this.config.periodos_estadia_opcoes?.find(p => p.id === participantData.stayPeriod);
            if (periodo && periodo.valores_evento_opcoes) {
                eventOption = periodo.valores_evento_opcoes.find(e => e.id === participantData.eventOption);
            }
        }

        if (!eventOption) return 0;

        const baseValue = eventOption.valor;
        
        // Se não tem data de nascimento ou regras de idade desabilitadas, retorna valor base
            return this.applyGatewayFee(baseValue);
        }
        
        const age = this.calculateAge(participantData.birthDate);
        if (age === null) {
            return this.applyGatewayFee(baseValue);
        }
        
        const ageRule = this.getAgeRule(age, 'evento');
        
        // Verificar gratuidade primeiro
        if (this.isEligibleForFree(participantData, 'evento')) {
            return 0;
        }
        
        // Verificar regra de excedente
        if (this.shouldApplyExcessRule(participantData, 'evento')) {
            const finalValue = baseValue * ageRule.regra_excedente_gratuito.percentual_valor_adulto;
            return this.applyGatewayFee(finalValue);
        }

        // Aplicar percentual normal da regra de idade
        const finalValue = baseValue * ageRule.percentual_valor_adulto;
        return this.applyGatewayFee(finalValue);
    }

    // ========== TAXA DE GATEWAY ==========
    applyGatewayFee(value) {
            return Math.round(value * 100) / 100;
        }
        
        const finalValue = value * (1 + this.selectedPaymentMethod.taxa_gateway_percentual);
        return Math.round(finalValue * 100) / 100;
    }

    // ========== SUBTOTAIS ==========
    calculateLodgingSubtotal() {
        return this.participants.reduce((total, participant) => {
            return total + this.calculateLodgingValue(participant);
        }, 0);
    }

    calculateEventSubtotal() {
        return this.participants.reduce((total, participant) => {
            return total + this.calculateEventValue(participant);
        }, 0);
    }

    // ========== CUPONS DE DESCONTO ==========
    calculateCouponDiscount() {
        if (!this.appliedCoupon) return 0;

        const lodgingSubtotal = this.calculateLodgingSubtotal();
        const eventSubtotal = this.calculateEventSubtotal();
        let baseValue = 0;

        // Determinar base de cálculo baseada na aplicação do cupom
        switch (this.appliedCoupon.aplicacao) {
            case 'total':
                baseValue = lodgingSubtotal + eventSubtotal;
                break;
            case 'hospedagem':
                baseValue = lodgingSubtotal;
                break;
            case 'evento':
                baseValue = eventSubtotal;
                break;
            default:
                baseValue = lodgingSubtotal + eventSubtotal;
        }

        let discount = 0;

        if (this.appliedCoupon.tipo_desconto === 'percentual') {
            discount = baseValue * this.appliedCoupon.valor_desconto;
        } else if (this.appliedCoupon.tipo_desconto === 'fixo') {
            discount = Math.min(this.appliedCoupon.valor_desconto, baseValue);
        }

        return Math.round(discount * 100) / 100;
    }

    // Validar cupom
    validateCoupon(couponCode) {
            return { valid: false, message: '' };
        }

        const coupon = coupons.find(c => 
            c.codigo.toUpperCase() === couponCode.toUpperCase() && c.ativo !== false
        );

        if (!coupon) {
            return { valid: false, message: 'Cupom não encontrado' };
        }

        // Verificar validade
        const now = new Date();
        const validFrom = coupon.data_validade_inicio ? new Date(coupon.data_validade_inicio) : null;
        const validUntil = new Date(coupon.data_validade_fim);

        if (validFrom && now < validFrom) {
            return { valid: false, message: 'Cupom ainda não está válido' };
        }

        if (now > validUntil) {
            return { valid: false, message: 'Cupom expirado' };
        }

        return { 
            valid: true, 
            coupon: coupon,
            message: `Desconto aplicado: ${this.formatCouponDiscount(coupon)}`
        };
    }

    // Formatar desconto do cupom para exibição
    formatCouponDiscount(coupon) {
        if (coupon.tipo_desconto === 'percentual') {
            return `${(coupon.valor_desconto * 100).toFixed(0)}%`;
        } else {
            return `R$ ${coupon.valor_desconto.toFixed(2).replace('.', ',')}`;
        }
    }

    // ========== TOTAL FINAL ==========
    calculateFinalTotal() {
        const lodgingSubtotal = this.calculateLodgingSubtotal();
        const eventSubtotal = this.calculateEventSubtotal();
        const discount = this.calculateCouponDiscount();
        
        const total = lodgingSubtotal + eventSubtotal - discount;
        return Math.max(0, Math.round(total * 100) / 100);
    }

    // ========== MÉTODOS PÚBLICOS ==========
    updateParticipants(participantsData) {
        this.participants = participantsData;
    }

    setCoupon(coupon) {
        this.appliedCoupon = coupon;
    }

    removeCoupon() {
        this.appliedCoupon = null;
    }

    setPaymentMethod(paymentMethod) {
        this.selectedPaymentMethod = paymentMethod;
    }

    formatCurrency(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    // Obter resumo completo dos cálculos
    getCalculationSummary() {
        const lodgingSubtotal = this.calculateLodgingSubtotal();
        const eventSubtotal = this.calculateEventSubtotal();
        const discount = this.calculateCouponDiscount();
        const finalTotal = this.calculateFinalTotal();

        return {
            lodgingSubtotal,
            eventSubtotal,
            discount,
            finalTotal,
            formatted: {
                lodgingSubtotal: this.formatCurrency(lodgingSubtotal),
                eventSubtotal: this.formatCurrency(eventSubtotal),
                discount: this.formatCurrency(discount),
                finalTotal: this.formatCurrency(finalTotal)
            },
            paymentMethod: this.selectedPaymentMethod,
            coupon: this.appliedCoupon
        };
    }

    // Obter detalhes de um participante específico
    getParticipantDetails(participantData) {
        const lodgingValue = this.calculateLodgingValue(participantData);
        const eventValue = this.calculateEventValue(participantData);
        const age = this.calculateAge(participantData.birthDate);
        
        let ageInfo = null;
        if (age !== null && this.ageRulesEnabled) {
            const lodgingRule = this.getAgeRule(age, 'hospedagem');
            const eventRule = this.getAgeRule(age, 'evento');
            
            ageInfo = {
                age,
                lodgingRule,
                eventRule,
                isFreeForLodging: this.isEligibleForFree(participantData, 'hospedagem'),
                isFreeForEvent: this.isEligibleForFree(participantData, 'evento'),
                isExcessForLodging: this.shouldApplyExcessRule(participantData, 'hospedagem'),
                isExcessForEvent: this.shouldApplyExcessRule(participantData, 'evento')
            };
        }

        return {
            lodgingValue,
            eventValue,
            totalValue: lodgingValue + eventValue,
            ageInfo,
            formatted: {
                lodgingValue: this.formatCurrency(lodgingValue),
                eventValue: this.formatCurrency(eventValue),
                totalValue: this.formatCurrency(lodgingValue + eventValue)
            }
        };
    }
}

// Instância global do calculador
let priceCalculator = null;

// Inicializar calculador quando evento for carregado
function initializePriceCalculator(eventConfig) {
    priceCalculator = new PriceCalculator(eventConfig);
    window.priceCalculator = priceCalculator; // Disponibilizar globalmente
    console.log('✅ Calculador de preços inicializado');
    return priceCalculator;
}
