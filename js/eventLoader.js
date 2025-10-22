// ============================================
// EVENT LOADER - Carrega configurações do JSON
// ============================================

class EventLoader {
    constructor() {
        this.config = null;
        this.eventSlug = null;
    }

    // Detecta qual evento carregar pela URL
    detectEventFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventParam = urlParams.get('evento');
        
        if (eventParam) {
            this.eventSlug = eventParam;
            console.log(`📋 Evento detectado na URL: ${eventParam}`);
            return eventParam;
        }
        
        // Fallback: tentar detectar pelo path
        const path = window.location.pathname;
        const match = path.match(/\/eventos\/([^\/]+)/);
        if (match) {
            this.eventSlug = match[1];
            console.log(`📋 Evento detectado no path: ${this.eventSlug}`);
            return this.eventSlug;
        }
        
        console.warn('⚠️ Nenhum evento especificado, usando padrão');
        return 'default';
    }

    // Carrega o JSON do evento
    async loadEventConfig(eventSlug = null) {
        const jsonPath = `eventos/${slug}.json`;
        
        try {
            console.log(`🔄 Carregando configuração: ${jsonPath}`);
            
            const response = await fetch(jsonPath);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.config = await response.json();
            console.log('✅ Configuração carregada:', this.config);
            
            // Validar configuração
            this.validateConfig();
            
            return this.config;
            
        } catch (error) {
            console.error('❌ Erro ao carregar configuração:', error);
            this.showErrorState(error.message);
            throw error;
        }
    }

    // Valida se o JSON tem os campos obrigatórios
    validateConfig() {
        const required = ['evento', 'branding', 'detalhes', 'modalidades', 'formulario'];
        const missing = required.filter(field => !this.config[field]);
        
        if (missing.length > 0) {
            throw new Error(`Campos obrigatórios faltando no JSON: ${missing.join(', ')}`);
        }
        
        // Validar status do evento
        if (!this.config.evento.inscricoes_abertas) {
            this.showClosedRegistration();
            throw new Error('Inscrições fechadas para este evento');
        }
        
        // Validar datas
        const now = new Date();
        const dataInicio = new Date(this.config.evento.data_inicio_inscricoes);
        const dataFim = new Date(this.config.evento.data_fim_inscricoes);
        
        if (now < dataInicio) {
            this.showNotOpenYet(dataInicio);
            throw new Error('Inscrições ainda não abertas');
        }
        
        if (now > dataFim) {
            this.showClosedRegistration();
            throw new Error('Período de inscrições encerrado');
        }
        
        console.log('✅ Configuração validada com sucesso');
    }

    // Aplica as configurações no HTML
    applyConfig() {
        if (!this.config) {
            console.error('❌ Nenhuma configuração carregada');
            return;
        }
        
        console.log('🎨 Aplicando configurações no HTML...');
        
        // SEO
        this.applySEO();
        
        // Branding
        this.applyBranding();
        
        // Detalhes do evento
        this.applyEventDetails();
        
        // Modalidades
        this.applyModalidades();
        
        // Campos personalizados
        this.applyCustomFields();

        // Inicializar calculadora de preços
        if (this.config.pagamento.habilitado) {
            initializePriceCalculator(this.config);
            this.applyPaymentMethods();
        }
        
        // Termos
        this.applyTerms();
        
        // Webhook
        this.configureWebhook();
        
        console.log('✅ Configurações aplicadas com sucesso');
    }

    // Aplica SEO
    applySEO() {
        const seo = this.config.seo;
        if (!seo) return;
        
        document.title = seo.title;
        
        // Meta tags
        this.setMetaTag('description', seo.description);
        this.setMetaTag('keywords', seo.keywords);
        
        // Open Graph
        this.setMetaTag('og:title', seo.title, 'property');
        this.setMetaTag('og:description', seo.description, 'property');
        this.setMetaTag('og:image', seo.og_image, 'property');
        
        console.log('✅ SEO aplicado');
    }

    setMetaTag(name, content, attr = 'name') {
        let meta = document.querySelector(`meta[${attr}="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attr, name);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }

    // Aplica branding (banner, logos, cores)
    applyBranding() {
        const branding = this.config.branding;
        
        // Banner
        if (branding.banner) {
            $('.header-banner').css('background-image', `url('${branding.banner.url}')`);
        }
        
        // Logos
        if (branding.logos && branding.logos.length > 0) {
            this.applyLogos(branding.logos);
        }
        
        // Cores personalizadas (CSS Variables)
        if (branding.cores) {
            const root = document.documentElement;
            root.style.setProperty('--primary-color', branding.cores.primaria);
            root.style.setProperty('--secondary-color', branding.cores.secundaria);
            root.style.setProperty('--accent-color', branding.cores.destaque);
        }
        
        console.log('✅ Branding aplicado');
    }

    applyLogos(logos) {
        const $logoContainer = $('.logo-container');
        $logoContainer.empty();
        
        if (logos.length === 1) {
            // Logo único
            const logo = logos[0];
            $logoContainer.html(`
                <img src="${logo.url}" alt="${logo.alt}" class="logo">
            `);
        } else if (logos.length === 2) {
            // Logos de parceria
            const [logo1, logo2] = logos;
            $logoContainer.html(`
                <img src="${logo1.url}" alt="${logo1.alt}" class="partner-logo logo-main">
                <img src="${logo2.url}" alt="${logo2.alt}" class="partner-logo logo-partner">
            `);
        } else {
            // Mais de 2 logos: usar apenas o primeiro
            console.warn('⚠️ Mais de 2 logos detectados, usando apenas o primeiro');
            const logo = logos[0];
            $logoContainer.html(`
                <img src="${logo.url}" alt="${logo.alt}" class="logo">
            `);
        }
    }

    // Aplica detalhes do evento na tela de boas-vindas
    applyEventDetails() {
        const { branding, detalhes } = this.config;
        
        // Título e subtítulo
        $('#event-title').text(branding.titulo);
        
        // Descrição
        let descricaoHTML = `<p><strong>${branding.subtitulo}</strong></p>`;
        descricaoHTML += `<p style="margin-top: 25px; font-size: 1.05em;">`;
        
        // Data
        const dataFormatada = this.formatDate(detalhes.data_evento);
        descricaoHTML += `<strong>📅 Data:</strong> ${dataFormatada}<br>`;
        
        // Horários
        detalhes.horarios.forEach(h => {
            const horarioTexto = h.horario_fim 
                ? `${h.horario} – ${h.horario_fim}` 
                : h.horario;
            descricaoHTML += `<strong>${h.descricao}:</strong> ${horarioTexto}<br>`;
        });
        
        // Local
        descricaoHTML += `<strong>📍 Local:</strong> ${detalhes.local.nome}<br>`;
        
        // Palestrantes
        if (detalhes.palestrantes && detalhes.palestrantes.length > 0) {
            const palestrantes = detalhes.palestrantes.map(p => p.nome).join(', ');
            descricaoHTML += `<strong>👩‍🏫 Com:</strong> ${palestrantes}`;
        }
        
        descricaoHTML += `</p>`;
        
        // Observações
        if (detalhes.observacoes) {
            descricaoHTML += `<p class="observations" style="margin-top: 20px;">${detalhes.observacoes.replace(/\n/g, '<br>')}</p>`;
        }
        
        $('#event-description').html(descricaoHTML);
        
        // Remover loading
        $('.loading-state').hide();
        $('#start-form-btn').show();
        
        console.log('✅ Detalhes do evento aplicados');
    }

    // Aplica modalidades de participação
    applyModalidades() {
        const modalidades = this.config.modalidades.opcoes;
        
        const $select = $('#participation-mode');
        $select.empty();
        $select.append('<option value="">Selecione a modalidade</option>');
        
        modalidades.forEach(mod => {
            const texto = `${mod.nome} – ${mod.descricao}`;
            $select.append(`<option value="${mod.id}" data-detalhes="${mod.detalhes}">${texto}</option>`);
        });
        
        // Atualizar info text ao selecionar
        $select.on('change', function() {
            const selected = $(this).find(':selected');
            const detalhes = selected.data('detalhes');
            
            if (detalhes) {
                const $info = $(this).siblings('.info-text');
                if ($info.length === 0) {
                    $(this).after(`<p class="info-text" style="margin-top: 10px;">${detalhes}</p>`);
                } else {
                    $info.text(detalhes);
                }
            }
        });
        
        console.log('✅ Modalidades aplicadas');
    }

    // Aplica campos personalizados
    applyCustomFields() {
        const campos = this.config.formulario.campos_personalizados;
        
        campos.forEach(campo => {
            if (campo.tipo === 'checkbox' && campo.secao === 'interesse_adicional') {
                // Já existe no HTML, apenas atualizar o label
                const $checkbox = $('#workshop-interest');
                $checkbox.siblings('.checkbox-text').text(campo.label);
            }
            // Adicionar outros tipos de campos personalizados conforme necessário
        });
        
        console.log('✅ Campos personalizados aplicados');
    }

    // Aplica termos e condições
    applyTerms() {
        const termos = this.config.termos;
        
        $('#terms-link').off('click').on('click', function(e) {
            e.preventDefault();
            
            if (termos.url_completa) {
                window.open(termos.url_completa, '_blank');
            } else {
                alert(`Termos e Condições:\n\n${termos.texto}`);
            }
        });
        
        console.log('✅ Termos aplicados');
    }

    // Configura webhook
    configureWebhook() {
        const integracao = this.config.integracao;
        
        if (window.webhookIntegration) {
            webhookIntegration.endpoints.submission = integracao.webhook_url;
            webhookIntegration.timeout = integracao.webhook_timeout;
            webhookIntegration.retryAttempts = integracao.webhook_retry;
            
            console.log('✅ Webhook configurado:', integracao.webhook_url);
        }
    }

    // Estados de erro
    showErrorState(message) {
        $('.loading-state').hide();
        $('.error-state').show();
        $('.error-state p').text(message);
    }

    showClosedRegistration() {
        $('.loading-state').hide();
        $('.welcome-section').html(`
            <h1>Inscrições Encerradas</h1>
            <p>O período de inscrições para este evento foi encerrado.</p>
            <p>Fique atento às nossas redes sociais para novos eventos!</p>
        `);
    }

    showNotOpenYet(dataInicio) {
        $('.loading-state').hide();
        const dataFormatada = this.formatDate(dataInicio.toISOString().split('T')[0]);
        $('.welcome-section').html(`
            <h1>Em Breve</h1>
            <p>As inscrições para este evento abrirão em <strong>${dataFormatada}</strong>.</p>
            <p>Volte nesta data para se inscrever!</p>
        `);
    }

    // Helpers
    formatDate(dateString) {
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                       'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const date = new Date(dateString + 'T00:00:00');
        return `${date.getDate()} de ${months[date.getMonth()]}`;
    }

    // Getter para configuração
    getConfig() {
        return this.config;
    }
}

// Instância global
let eventLoader = null;

// Inicialização
async function initializeEventLoader() {
    eventLoader = new EventLoader();
    
    try {
        await eventLoader.loadEventConfig();
        eventLoader.applyConfig();
        return true;
    } catch (error) {
        console.error('❌ Falha ao inicializar evento:', error);
        return false;
    }
}

// Aplica formas de pagamento
applyPaymentMethods() {
    const formasPagamento = this.config.pagamento.formas_pagamento_opcoes;
    
    const $select = $('#payment-method');
    $select.empty();
    $select.append('<option value="">Selecione a forma de pagamento</option>');
    
    formasPagamento.forEach(forma => {
        $select.append(`<option value="${forma.id}">${forma.label}</option>`);
    });
    
    // Atualizar descrição ao selecionar
    $select.on('change', function() {
        const formaId = $(this).val();
        const forma = formasPagamento.find(f => f.id === formaId);
        
        if (forma && forma.descricao) {
            // Exibir política de cancelamento
            $('#cancellation-policy-section').show();
            $('#cancellation-policy-section .policy-content').html(forma.descricao);
        } else {
            $('#cancellation-policy-section').hide();
        }
        
        // Recalcular totais
        if (window.recalcularTotais) {
            window.recalcularTotais();
        }
    });
    
    console.log('✅ Formas de pagamento aplicadas');
}

// Aplicar formas de pagamento
applyPaymentMethods() {
    if (!this.config.pagamento?.habilitado) {
        console.log('⚠️ Pagamento desabilitado para este evento');
        $('.payment-method-section').hide();
        $('.coupon-section').hide();
        $('.totals-summary').hide();
        return;
    }
    
    const formasPagamento = this.config.pagamento.formas_pagamento_opcoes;
    
    const $select = $('#payment-method');
    $select.empty();
    $select.append('<option value="">Selecione a forma de pagamento</option>');
    
    formasPagamento.forEach(forma => {
        $select.append(`<option value="${forma.id}" data-forma='${JSON.stringify(forma)}'>${forma.label}</option>`);
    });
    
    // Atualizar política ao selecionar
    $select.on('change', function() {
        const selected = $(this).find(':selected');
        const formaData = selected.data('forma');
        
        if (formaData) {
            // Atualizar política de cancelamento
            $('#cancellation-policy-section .policy-content').html(formaData.descricao);
            $('#cancellation-policy-section').show();
            
            // Atualizar calculadora de preços
            if (window.priceCalculator) {
                priceCalculator.setPaymentMethod(formaData);
                // Recalcular preços
                updateAllPrices();
            }
        } else {
            $('#cancellation-policy-section').hide();
        }
    });
    
    console.log('✅ Formas de pagamento aplicadas');
}
