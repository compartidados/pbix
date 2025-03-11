// Configuração da aplicação
const CONFIG_FILE = 'powerbi-config.json';
let reportConfig = null;
let currentReport = null;

// Elementos DOM
const reportGrid = document.getElementById('report-grid');
const statusMessage = document.getElementById('status-message');
const lastUpdated = document.getElementById('last-updated');
const modal = document.getElementById('reportModal');
const modalClose = document.querySelector('.close');
const modalTitle = document.getElementById('modal-title');
const reportContainer = document.getElementById('reportContainer');

// Carregar configuração dos relatórios
async function loadConfiguration() {
    try {
        statusMessage.textContent = 'Carregando configuração dos relatórios...';
        
        const response = await fetch(CONFIG_FILE);
        if (!response.ok) {
            throw new Error('Falha ao carregar arquivo de configuração.');
        }
        
        reportConfig = await response.json();
        
        // Verificar se a configuração é válida
        if (!reportConfig.reports || !Array.isArray(reportConfig.reports)) {
            throw new Error('Configuração inválida. Formato inesperado.');
        }
        
        // Mostrar quando os tokens foram gerados
        const generatedDate = new Date(reportConfig.generated);
        lastUpdated.textContent = `Última atualização: ${formatDate(generatedDate)}`;
        
        // Checar se os tokens podem estar expirados (mais de 1 hora)
        const now = new Date();
        const tokenAge = (now - generatedDate) / (1000 * 60); // em minutos
        
        if (tokenAge > 55) { // Tokens duram 1 hora, avisar com 5 minutos de sobra
            statusMessage.textContent = '⚠️ Os tokens podem estar expirados. Atualize a configuração.';
            statusMessage.style.color = 'red';
        } else {
            statusMessage.textContent = `${reportConfig.reports.length} relatórios disponíveis`;
            statusMessage.style.color = 'green';
        }
        
        // Renderizar os cards dos relatórios
        renderReportCards();
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        statusMessage.textContent = `❌ Erro: ${error.message}`;
        statusMessage.style.color = 'red';
    }
}

// Formatar data para exibição
function formatDate(date) {
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Renderizar cards para cada relatório
function renderReportCards() {
    reportGrid.innerHTML = ''; // Limpar grid
    
    reportConfig.reports.forEach(report => {
        const card = document.createElement('div');
        card.className = 'report-card';
        
        // Criar elemento da miniatura
        let thumbnailHtml = '';
        if (report.thumbnail) {
            thumbnailHtml = `<div class="report-thumbnail" style="background-image: url('${report.thumbnail}')"></div>`;
        } else {
            thumbnailHtml = `
                <div class="report-thumbnail">
                    <div class="default-thumbnail">📊</div>
                </div>
            `;
        }
        
        card.innerHTML = `
            ${thumbnailHtml}
            <div class="report-info">
                <h3 class="report-title">${report.name}</h3>
                <div class="view-btn" data-report-id="${report.id}">Visualizar Relatório</div>
            </div>
        `;
        
        reportGrid.appendChild(card);
    });
    
    // Adicionar event listeners para os botões de visualização
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const reportId = btn.getAttribute('data-report-id');
            openReportModal(reportId);
        });
    });
}

// Abrir modal e carregar relatório
function openReportModal(reportId) {
    currentReport = reportConfig.reports.find(r => r.id === reportId);
    
    if (!currentReport) {
        alert('Relatório não encontrado!');
        return;
    }
    
    // Atualizar título do modal
    modalTitle.textContent = currentReport.name;
    
    // Mostrar modal
    modal.style.display = 'block';
    
    // Carregar o relatório
    loadReport();
}

// Carregar relatório no container
function loadReport() {
    try {
        // Verificar se temos as informações necessárias
        if (!currentReport || !currentReport.embedUrl || !currentReport.token) {
            throw new Error('Informações do relatório incompletas ou inválidas.');
        }
        
        // Limpar container
        reportContainer.innerHTML = '';
        
        // Obter objetos do Power BI
        const models = window['powerbi-client'].models;
        
        // Configuração para o relatório
        const config = {
            type: 'report',
            tokenType: models.TokenType.Embed,
            accessToken: currentReport.token,
            embedUrl: currentReport.embedUrl,
            permissions: models.Permissions.Read,
            settings: {
                filterPaneEnabled: true,
                navContentPaneEnabled: true
            }
        };
        
        // Incorporar o relatório
        const report = powerbi.embed(reportContainer, config);
        
        // Manipular erros
        report.on('error', function(event) {
            console.error('Erro ao carregar relatório:', event.detail);
            reportContainer.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3>Erro ao carregar relatório</h3>
                    <p>O token pode ter expirado. Tente atualizar a página ou gerar uma nova configuração.</p>
                </div>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar relatório:', error);
        reportContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3>Erro ao carregar relatório</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Event listeners
modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
    // Limpar o container ao fechar
    reportContainer.innerHTML = '';
    currentReport = null;
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        reportContainer.innerHTML = '';
        currentReport = null;
    }
});

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', loadConfiguration);