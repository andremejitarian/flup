// ============================================
// SCRIPT.JS - SISTEMA DINÂMICO DE EVENTOS
// Carrega configurações do eventos.json
// ============================================

// ========== VARIÁVEIS GLOBAIS ==========
let currentEvent = null;
let currentStep = 1;
let participantData = {};
let submissionInProgress = false;

// ========== INICIALIZAÇÃO ==========
$(document).ready(function() {
    console.log('🎯 Iniciando sistema de formulários...');
    
    // Obter ID do evento da URL
    const urlParams = new URLSearchParams(window.location.search);
    
    // Carregar evento
    loadEventFromJSON(eventoId);
});

// ========== CARREGAR EVENTO DO JSON ==========
async function loadEventFromJSON(eventoId) {
    try {
        console.log(`📥 Carregando evento: ${eventoId}`);
        
        const response = await fetch('eventos.json');
        
        if (!response.ok) {
            throw new Error('Erro ao carregar eventos.json');
        }
        
        const data = await response.json();
        currentEvent = data.eventos[eventoId];
        
        if (!currentEvent) {
            throw new Error(`Evento ${eventoId} não encontrado`);
        }
        
        if (!currentEvent.ativo) {
            throw new Error('Este evento não está mais ativo');
        }
        
        console.log('✅ Evento carregado:', currentEvent);
        
        // Inicializar formulário com dados do evento
        initializeForm();
        
    } catch (error) {
        console.error('❌ Erro ao carregar evento:', error);
        showErrorState(error.message);
    }
}

// ========== INICIALIZAR FORMULÁRIO ==========
function initializeForm() {
    // Configurar interface
    setupEventInterface();
    
    // Aplicar máscaras
    applyMasks();
    
    // Event Listeners
    setupEventListeners();
    
    // Inicializar webhook
    initializeWebhookIntegration();
    
    // Ocultar loading e mostrar botão
    hideLoadingState();
    
    console.log('✅ Formulário inicializado');
}

// ========== CONFIGURAR INTERFACE DO EVENTO ==========
function setupEventInterface() {
    // Banner
    if (currentEvent.visual.banner) {
        $('.header-banner').css('background-image', `url('${currentEvent.visual.banner.url}')`);
    }
    
    // Logos
    setupLogos();
    
    // Título e descrição
    $('#event-title').text(currentEvent.informacoes_basicas.titulo);
    
    // Montar descrição completa
    let descricaoHTML = `<p><strong>${currentEvent.informacoes_basicas.subtitulo}</strong></p>`;
    descricaoHTML += `<p style="margin-top: 25px; font-size: 1.05em;">`;
    descricaoHTML += `<strong>📅 Data:</strong> ${currentEvent.data_hora.data_formatada}<br>`;
    
    currentEvent.data_hora.horarios.forEach(horario => {
        descricaoHTML += `<strong>${horario.descricao}:</strong> ${horario.horario}<br>`;
    });
    
    descricaoHTML += `<strong>📍 Local:</strong> ${currentEvent.localizacao.nome}<br>`;
    
    if (currentEvent.informacoes_basicas.palestrante) {
        descricaoHTML += `<strong>👩‍🏫 Com:</strong> ${currentEvent.informacoes_basicas.palestrante}`;
    } else if (currentEvent.informacoes_basicas.facilitador) {
        descricaoHTML += `<strong>👨‍🏫 Facilitador:</strong> ${currentEvent.informacoes_basicas.facilitador}`;
    }
    
    descricaoHTML += `</p>`;
    
    $('#event-description').html(descricaoHTML);
    
    // Observações
    if (currentEvent.informacoes_basicas.observacoes) {
        $('#event-observations').html(currentEvent.informacoes_basicas.observacoes);
    }
    
    // Modalidades de participação
    setupModalidades();
    
    // Campos customizados
    setupCustomFields();
    
    // Termos e condições
    setupTerms();
}

// ========== CONFIGURAR LOGOS ==========
function setupLogos() {
    const logos = currentEvent.visual.logos;
    const $logoContainer = $('.logo-container');
    
    $logoContainer.empty();
    
    if (logos.length === 1) {
        // Logo único
        $logoContainer.html(`
            <img src="${logos[0].url}" 
                 alt="${logos[0].alt}" 
                 class="logo">
        `);
    } else if (logos.length === 2) {
        // Logos de parceria
        const logoMain = logos.find(l => l.posicao === 'principal');
        const logoPartner = logos.find(l => l.posicao === 'parceiro');
        
        $logoContainer.html(`
            <img src="${logoMain.url}" 
                 alt="${logoMain.alt}" 
                 class="partner-logo logo-main">
            <img src="${logoPartner.url}" 
                 alt="${logoPartner.alt}" 
                 class="partner-logo logo-partner">
        `);
    }
}

// ========== CONFIGURAR MODALIDADES ==========
function setupModalidades() {
    const $select = $('#participation-mode');
    $select.empty();
    $select.append('<option value="">Selecione a modalidade</option>');
    
    currentEvent.modalidades.forEach(modalidade => {
        const priceText = modalidade.gratuito ? '' : ` - R$ ${modalidade.preco.toFixed(2)}`;
        $select.append(`
            <option value="${modalidade.id}" 
                    data-gratuito="${modalidade.gratuito}">
                ${modalidade.nome}${priceText}
            </option>
        `);
    });
}

// ========== CONFIGURAR CAMPOS CUSTOMIZADOS ==========
function setupCustomFields() {
    
    if (customFields.length === 0) return;
    
    customFields.forEach(field => {
        let fieldHTML = '';
        
        if (field.tipo === 'checkbox') {
            fieldHTML = `
                <div class="section-divider">
                    <h4>📚 ${field.secao.toUpperCase().replace('_', ' ')}</h4>
                </div>
                <label class="checkbox-container">
                    <input type="checkbox" id="${field.id}">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">${field.label}</span>
                </label>
            `;
        } else if (field.tipo === 'select') {
            fieldHTML = `
                <div class="section-divider">
                    <h4>📋 ${field.secao.toUpperCase().replace('_', ' ')}</h4>
                </div>
                <div class="form-group">
                    <label>${field.label}</label>
                    <select id="${field.id}" class="form-control">
                        <option value="">Selecione uma opção</option>
                        ${field.opcoes.map(opt => `<option value="${opt.valor}">${opt.texto}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (field.tipo === 'textarea') {
            fieldHTML = `
                <div class="form-group">
                    <label>${field.label}</label>
                    <textarea id="${field.id}" 
                              class="form-control" 
                              rows="4" 
                </div>
            `;
        }
        
        // Inserir antes dos botões de navegação
        $('.participant-form .navigation-buttons').before(fieldHTML);
    });
}

// ========== CONFIGURAR TERMOS ==========
function setupTerms() {
    $('#terms-link').off('click').on('click', function(e) {
        e.preventDefault();
        
        if (currentEvent.termos_condicoes.url) {
            window.open(currentEvent.termos_condicoes.url, '_blank');
        } else if (currentEvent.termos_condicoes.texto) {
            alert(currentEvent.termos_condicoes.texto);
        }
    });
}

// ========== MÁSCARAS ==========
function applyMasks() {
    $('.cpf-mask').mask('000.000.000-00', {
        reverse: false,
        clearIfNotMatch: true
    });
    
    updatePhoneMask('+55');
}

function updatePhoneMask(countryCode) {
    const phoneMasks = {
        '+55': '(00) 00000-0000',
        '+1': '(000) 000-0000',
        '+351': '000 000 000',
        '+49': '000 0000 0000',
        '+34': '000 000 000',
        '+33': '0 00 00 00 00'
    };
    
    $('#phone').mask(mask, { clearIfNotMatch: true });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    $('#start-form-btn').on('click', () => goToStep(2));
    $('.back-btn').on('click', () => goToStep(currentStep - 1));
    $('.next-btn').on('click', () => {
        if (validateStep2()) {
            collectParticipantData();
            generateSummary();
            goToStep(3);
        }
    });
    $('.submit-btn').on('click', () => {
        if (validateStep3()) {
            submitRegistration();
        }
    });
    
    $('#country-code').on('change', function() {
        updatePhoneMask($(this).val());
        $('#phone').val('');
    });
    
    $('#email').on('blur', function() {
        validateEmail($(this));
    });
    
    $('#cpf').on('blur', function() {
        const cpfValue = $(this).val().replace(/\D/g, '');
        if (cpfValue.length > 0) {
            validateCPF($(this));
        }
    });
    
    $('#phone').on('blur', function() {
        validatePhoneNumber($(this));
    });
}

// ========== NAVEGAÇÃO ==========
function goToStep(step) {
    $('.form-content').hide();
    $(`#step-${step}`).fadeIn(300);
    currentStep = step;
    $('html, body').animate({ scrollTop: 0 }, 300);
    console.log(`📍 Step ${step}`);
}

// ========== VALIDAÇÕES ==========
function validateStep2() {
    let isValid = true;
    const errors = [];
    
    const fullName = $('#full-name').val().trim();
    if (fullName.length < 3) {
        isValid = false;
        errors.push('Nome completo é obrigatório');
        highlightError('#full-name');
    } else {
        removeHighlight('#full-name');
    }
    
    if (!validateEmail($('#email'))) {
        isValid = false;
        errors.push('E-mail inválido');
    }
    
    if (!validatePhoneNumber($('#phone'))) {
        isValid = false;
        errors.push('Telefone inválido');
    }
    
    const participationMode = $('#participation-mode').val();
    if (!participationMode) {
        isValid = false;
        errors.push('Selecione a modalidade de participação');
        highlightError('#participation-mode');
    } else {
        removeHighlight('#participation-mode');
    }
    
    // Validar CPF se for obrigatório
    if (currentEvent.campos_formulario.obrigatorios.includes('cpf')) {
        if (!validateCPF($('#cpf'))) {
            isValid = false;
            errors.push('CPF inválido');
        }
    }
    
    if (!isValid) {
        showToast('Por favor, corrija os erros no formulário', 'error');
        console.warn('❌ Validação falhou:', errors);
        scrollToElement($('.form-control.error').first());
    }
    
    return isValid;
}

function validateStep3() {
    const termsAccepted = $('#terms-conditions').is(':checked');
    
    if (!termsAccepted) {
        showToast('Você precisa aceitar os Termos e Condições', 'error');
        highlightError('.terms-section');
        scrollToElement($('.terms-section'));
        return false;
    }
    
    removeHighlight('.terms-section');
    return true;
}

function validateEmail($input) {
    const email = $input.val().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        $input.addClass('error').removeClass('valid');
        return false;
    }
    
    $input.removeClass('error').addClass('valid');
    return true;
}

function validatePhoneNumber($input) {
    const phone = $input.val().replace(/\D/g, '');
    const countryCode = $('#country-code').val();
    
    const minLengths = {
        '+55': 10,
        '+1': 10,
        '+351': 9,
        '+49': 10,
        '+34': 9,
        '+33': 9
    };
    
    
    if (phone.length < minLength) {
        $input.addClass('error').removeClass('valid');
        return false;
    }
    
    $input.removeClass('error').addClass('valid');
    return true;
}

function validateCPF($input) {
    const cpf = $input.val().replace(/\D/g, '');
    
        $input.addClass('error').removeClass('valid');
        $('.cpf-feedback').text('CPF inválido').addClass('error-message');
        return false;
    }
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder !== parseInt(cpf.substring(9, 10))) {
        $input.addClass('error').removeClass('valid');
        $('.cpf-feedback').text('CPF inválido').addClass('error-message');
        return false;
    }
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder !== parseInt(cpf.substring(10, 11))) {
        $input.addClass('error').removeClass('valid');
        $('.cpf-feedback').text('CPF inválido').addClass('error-message');
        return false;
    }
    
    $input.removeClass('error').addClass('valid');
    $('.cpf-feedback').text('CPF válido').removeClass('error-message').addClass('success-message');
    return true;
}

// ========== COLETA DE DADOS ==========
function collectParticipantData() {
    participantData = {
        nome_completo: $('#full-name').val().trim(),
        email: $('#email').val().trim(),
        telefone_codigo_pais: $('#country-code').val(),
        telefone: $('#phone').val().trim(),
        modalidade_participacao: $('#participation-mode').val()
    };
    
    // Coletar campos customizados
    customFields.forEach(field => {
        const $field = $(`#${field.id}`);
        if (field.tipo === 'checkbox') {
            participantData[field.id] = $field.is(':checked');
        } else {
        }
    });
    
    console.log('📋 Dados coletados:', participantData);
}

// ========== GERAÇÃO DE RESUMO ==========
function generateSummary() {
    const modalidade = currentEvent.modalidades.find(m => m.id === participantData.modalidade_participacao);
    
    let summaryHTML = `
        <div class="responsible-payer-summary">
            <h3>📋 Dados do Participante</h3>
            <div class="payer-info">
                <p><strong>Nome:</strong> ${participantData.nome_completo}</p>
                <p><strong>E-mail:</strong> ${participantData.email}</p>
                <p><strong>Telefone:</strong> ${participantData.telefone_codigo_pais} ${participantData.telefone}</p>
                ${participantData.cpf ? `<p><strong>CPF:</strong> ${formatCPF(participantData.cpf)}</p>` : ''}
                ${participantData.data_nascimento ? `<p><strong>Data Nasc.:</strong> ${formatDate(participantData.data_nascimento)}</p>` : ''}
                ${participantData.genero ? `<p><strong>Gênero:</strong> ${capitalizeFirst(participantData.genero)}</p>` : ''}
            </div>
        </div>
        
        <div class="responsible-payer-summary">
            <h3>🎯 Detalhes da Participação</h3>
            <div class="payer-info">
                <p><strong>Modalidade:</strong> ${modalidade.nome}</p>
                ${!modalidade.gratuito ? `<p><strong>Valor:</strong> R$ ${modalidade.preco.toFixed(2)}</p>` : ''}
            </div>
        </div>
        
        <div class="responsible-payer-summary">
            <h3>📅 Informações do Evento</h3>
            <div class="payer-info">
                <p><strong>Evento:</strong> ${currentEvent.informacoes_basicas.titulo}</p>
                <p><strong>Data:</strong> ${currentEvent.data_hora.data_formatada}</p>
                <p><strong>Local:</strong> ${currentEvent.localizacao.nome}</p>
            </div>
        </div>
    `;
    
    $('#summary-content').html(summaryHTML);
}

// ========== SUBMISSÃO ==========
async function submitRegistration() {
    if (submissionInProgress) return;
    
    submissionInProgress = true;
    const $submitBtn = $('.submit-btn');
    $submitBtn.prop('disabled', true).addClass('loading').text('Enviando...');
    
    try {
        const inscricaoId = generateInscricaoId();
        
        const submissionData = {
            inscricao_id: inscricaoId,
            evento_id: currentEvent.id,
            evento: {
                nome: currentEvent.informacoes_basicas.titulo,
                data: currentEvent.data_hora.data,
                local: currentEvent.localizacao.nome
            },
            participante: participantData,
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 Enviando:', submissionData);
        
        const result = await webhookIntegration.submitForm(submissionData);
        
        if (result.success) {
            console.log('✅ Sucesso');
            showConfirmation(inscricaoId);
            goToStep(4);
        } else {
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
        showToast('Erro ao enviar inscrição. Tente novamente.', 'error');
        $submitBtn.prop('disabled', false).removeClass('loading').text('Confirmar Inscrição');
    } finally {
        submissionInProgress = false;
    }
}

// ========== CONFIRMAÇÃO ==========
function showConfirmation(inscricaoId) {
    const modalidade = currentEvent.modalidades.find(m => m.id === participantData.modalidade_participacao);
    
    $('#confirmation-id').text(`#${currentEvent.id.substring(0, 2)}${inscricaoId}`);
    $('#confirmation-name').text(participantData.nome_completo);
    $('#confirmation-email').text(participantData.email);
    $('#confirmation-mode').text(modalidade.nome);
    
    if (participantData.modalidade_participacao === 'online') {
        $('#online-instruction').html(currentEvent.confirmacao.instrucoes_online).show();
        $('#presencial-instruction').hide();
    } else {
        $('#online-instruction').hide();
        $('#presencial-instruction').html(currentEvent.confirmacao.instrucoes_presencial).show();
    }
}

// ========== FUNÇÕES AUXILIARES ==========
function generateInscricaoId() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`;
}

function formatCPF(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function highlightError(selector) {
    $(selector).addClass('error field-highlight');
    setTimeout(() => $(selector).removeClass('field-highlight'), 2000);
}

function removeHighlight(selector) {
    $(selector).removeClass('error');
}

function scrollToElement($element) {
    if ($element.length) {
        $('html, body').animate({
            scrollTop: $element.offset().top - 100
        }, 500);
    }
}

function showToast(message, type = 'info') {
    const toast = $(`
        <div class="toast toast-${type}">
            <span class="toast-message">${message}</span>
            <button class="toast-close">×</button>
        </div>
    `);
    
    $('body').append(toast);
    
    toast.find('.toast-close').on('click', function() {
        toast.fadeOut(300, function() { $(this).remove(); });
    });
    
    setTimeout(() => {
        toast.fadeOut(300, function() { $(this).remove(); });
    }, 5000);
}

function hideLoadingState() {
    $('.loading-state').hide();
    $('#start-form-btn').show();
}

function showErrorState(message) {
    $('.loading-state').hide();
    $('.error-state').show().find('p').text(message);
}
