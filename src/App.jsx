<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SACP - Sistema de Apoio à Coordenação Pedagógica</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary: #2C3E50;
            --secondary: #34495E;
            --accent: #3498DB;
            --bg: #F5F7FA;
            --white: #FFFFFF;
            --text: #333333;
            --text-light: #7F8C8D;
            --danger: #E74C3C; /* Vermelho - Prioridade Máxima */
            --warning: #F1C40F; /* Amarelo - Atenção */
            --info: #3498DB; /* Azul - Regular */
            --success: #2ECC71; /* Verde - Potencial */
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        
        body { background-color: var(--bg); display: flex; height: 100vh; overflow: hidden; color: var(--text); }

        /* Login Screen */
        #login-screen {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex; justify-content: center; align-items: center; z-index: 1000;
        }
        .login-box {
            background: var(--white); padding: 40px; border-radius: 12px;
            width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
        }
        .login-box h2 { margin-bottom: 20px; color: var(--primary); }
        .input-group { margin-bottom: 15px; text-align: left; }
        .input-group label { display: block; margin-bottom: 5px; font-size: 0.9em; color: var(--text-light); }
        .input-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
        .btn-primary {
            background-color: var(--primary); color: white; border: none; padding: 12px;
            width: 100%; border-radius: 6px; cursor: pointer; font-size: 1em; transition: 0.3s;
        }
        .btn-primary:hover { background-color: var(--secondary); }

        /* Layout Principal */
        #app-container { display: none; width: 100%; height: 100%; display: flex; } /* Hidden by default via CSS */
        
        /* Sidebar */
        aside {
            width: 250px; background-color: var(--white); border-right: 1px solid #ddd;
            display: flex; flex-direction: column; padding: 20px 0;
            flex-shrink: 0; /* Impede que a sidebar encolha */
        }
        .brand { padding: 0 20px 20px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
        .brand h3 { color: var(--primary); font-size: 1.2em; }
        .brand span { font-size: 0.8em; color: var(--text-light); }
        
        nav ul { list-style: none; }
        nav li { padding: 12px 20px; cursor: pointer; color: var(--text-light); transition: 0.2s; display: flex; align-items: center; gap: 10px; }
        nav li:hover, nav li.active { background-color: #eef2f7; color: var(--primary); border-left: 4px solid var(--primary); }
        
        /* Main Content */
        main { flex: 1; padding: 30px; overflow-y: auto; width: 100%; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        h1 { font-size: 1.8em; color: var(--primary); }
        .user-profile { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 40px; height: 40px; background: var(--accent); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; }

        /* Cards & Dashboard */
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: var(--white); padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .card h4 { color: var(--text-light); font-size: 0.9em; margin-bottom: 10px; }
        .card .number { font-size: 2em; font-weight: bold; color: var(--primary); }
        
        /* Calendar Widget */
        .calendar-strip { display: flex; justify-content: space-between; margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; }
        .day-box { text-align: center; padding: 10px; border-radius: 6px; cursor: pointer; flex: 1; margin: 0 5px; }
        .day-box:hover { background: #f0f0f0; }
        .day-box.today { background: var(--accent); color: white; }

        /* Lists & Tables */
        .list-container { background: var(--white); border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .list-item { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s; }
        .list-item:hover { background-color: #fafafa; }
        .list-item:last-child { border-bottom: none; }
        
        /* Tags/Badges */
        .badge { padding: 5px 10px; border-radius: 12px; font-size: 0.75em; font-weight: bold; color: white; }
        .bg-red { background-color: var(--danger); }
        .bg-yellow { background-color: var(--warning); color: #333; }
        .bg-blue { background-color: var(--info); }
        .bg-green { background-color: var(--success); }

        /* Student Detail View */
        .student-header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; background: white; padding: 20px; border-radius: 8px; }
        .student-tabs { display: flex; gap: 10px; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
        .tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab.active { border-bottom: 2px solid var(--primary); color: var(--primary); font-weight: bold; }
        .tab-content { display: none; }
        .tab-content.active { display: block; animation: fadeIn 0.3s; }

        /* Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .hidden { display: none !important; }

        /* Breadcrumb/Back Button */
        .breadcrumb { margin-bottom: 15px; color: var(--text-light); font-size: 0.9em; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .breadcrumb:hover { color: var(--primary); }

    </style>
</head>
<body>

    <div id="login-screen">
        <div class="login-box">
            <h2>SACP</h2>
            <p style="margin-bottom: 20px; color: #666;">Sistema de Apoio à Coordenação Pedagógica</p>
            <div class="input-group">
                <label>E-mail</label>
                <input type="email" value="coordenadora@escola.com">
            </div>
            <div class="input-group">
                <label>Senha</label>
                <input type="password" value="********">
            </div>
            <button class="btn-primary" onclick="login()">Entrar</button>
            <p style="margin-top: 15px; font-size: 0.8em;"><a href="#">Recuperar senha</a></p>
        </div>
    </div>

    <div id="app-container">
        <aside>
            <div class="brand">
                <h3>SACP</h3>
                <span>Coordenação Pedagógica</span>
            </div>
            <nav>
                <ul>
                    <li onclick="navigate('dashboard')" class="active" id="nav-dashboard"><i class="fas fa-home"></i> Dashboard</li>
                    <li onclick="navigate('agenda')" id="nav-agenda"><i class="fas fa-calendar-alt"></i> Agenda</li>
                    <li onclick="navigate('schools')" id="nav-schools"><i class="fas fa-school"></i> Escolas</li>
                    <li onclick="navigate('classes')" id="nav-classes"><i class="fas fa-users"></i> Turmas</li>
                    <li onclick="navigate('students')" id="nav-students"><i class="fas fa-user-graduate"></i> Alunos</li>
                    <li onclick="navigate('reports')" id="nav-reports"><i class="fas fa-chart-bar"></i> Relatórios</li>
                    <li onclick="navigate('settings')" id="nav-settings"><i class="fas fa-cog"></i> Configurações</li>
                </ul>
            </nav>
        </aside>

        <main>
            <header>
                <h1 id="page-title">Visão Geral</h1>
                <div class="user-profile">
                    <span>Olá, Maria (Coord.)</span>
                    <div class="avatar">M</div>
                </div>
            </header>

            <div id="view-dashboard" class="view-section">
                <div class="calendar-strip">
                    <div class="day-box">SEG<br>20</div>
                    <div class="day-box">TER<br>21</div>
                    <div class="day-box today">QUA<br>22</div>
                    <div class="day-box">QUI<br>23</div>
                    <div class="day-box">SEX<br>24</div>
                </div>

                <div class="cards-grid">
                    <div class="card">
                        <h4>Alunos em Risco (Vermelho)</h4>
                        <div class="number" style="color: var(--danger)">12</div>
                    </div>
                    <div class="card">
                        <h4>Visitas Agendadas</h4>
                        <div class="number">3</div>
                    </div>
                    <div class="card">
                        <h4>Sondagens Pendentes</h4>
                        <div class="number" style="color: var(--warning)">8</div>
                    </div>
                </div>

                <h3 style="margin-bottom: 15px;">Atividades de Hoje</h3>
                <div class="list-container">
                    <div class="list-item">
                        <div>
                            <strong>Observação de Sala</strong>
                            <div style="font-size:0.8em; color:gray;">Turma 301 - Prof. Ana</div>
                        </div>
                        <span class="badge bg-blue">09:00</span>
                    </div>
                    <div class="list-item">
                        <div>
                            <strong>Reunião com Pais (João da Silva)</strong>
                            <div style="font-size:0.8em; color:gray;">Motivo: Baixa Frequência</div>
                        </div>
                        <span class="badge bg-red">14:00</span>
                    </div>
                </div>
            </div>

            <div id="view-schools" class="view-section hidden">
                <button class="btn-primary" style="width: auto; margin-bottom: 20px;">+ Adicionar Escola</button>
                <div class="list-container">
                    <div class="list-item" onclick="selectSchool('Escola Municipal Estrela do Saber')">
                        <div>
                            <strong>Escola Municipal Estrela do Saber</strong>
                            <div style="font-size:0.8em; color:gray;">Zona Urbana • 12 Turmas</div>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="list-item" onclick="selectSchool('Escola Rural Caminho Verde')">
                        <div>
                            <strong>Escola Rural Caminho Verde</strong>
                            <div style="font-size:0.8em; color:gray;">Zona Rural • 4 Turmas</div>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div id="view-classes" class="view-section hidden">
                <div class="breadcrumb" onclick="navigate('schools')"><i class="fas fa-arrow-left"></i> Voltar para Escolas</div>
                <h2 style="margin-bottom: 20px;" id="selected-school-title">Turmas</h2>
                <div class="list-container">
                    <div class="list-item" onclick="selectClass('3º Ano A')">
                        <div>
                            <strong>3º Ano A</strong>
                            <div style="font-size:0.8em; color:gray;">Prof. Ana • 25 Alunos</div>
                        </div>
                        <span class="badge bg-yellow">2 Atenção</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="list-item" onclick="selectClass('3º Ano B')">
                        <div>
                            <strong>3º Ano B</strong>
                            <div style="font-size:0.8em; color:gray;">Prof. Carlos • 24 Alunos</div>
                        </div>
                        <span class="badge bg-green">Sem riscos</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div id="view-students" class="view-section hidden">
                 <div class="breadcrumb" onclick="navigate('classes')"><i class="fas fa-arrow-left"></i> Voltar para Turmas</div>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <input type="text" placeholder="Buscar aluno..." style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; flex: 1;">
                    <select style="padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        <option>Todos os Status</option>
                        <option>Vermelho (Prioridade)</option>
                        <option>Amarelo (Atenção)</option>
                    </select>
                </div>
                
                <div class="list-container">
                    <div class="list-item" onclick="selectStudent()">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--danger);"></div>
                            <div>
                                <strong>João da Silva</strong>
                                <div style="font-size:0.8em; color:gray;">Frequência: 78% • Alfabetização: Silábico</div>
                            </div>
                        </div>
                        <span class="badge bg-red">Prioridade</span>
                    </div>
                    <div class="list-item">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--info);"></div>
                            <div>
                                <strong>Maria Oliveira</strong>
                                <div style="font-size:0.8em; color:gray;">Frequência: 95% • Alfabetização: Alfabético</div>
                            </div>
                        </div>
                        <span class="badge bg-blue">Regular</span>
                    </div>
                </div>
            </div>

            <div id="view-student-detail" class="view-section hidden">
                <div class="breadcrumb" onclick="navigate('students')"><i class="fas fa-arrow-left"></i> Voltar para Lista</div>
                
                <div class="student-header">
                    <div style="width: 60px; height: 60px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5em; color: #666;">
                        <i class="fas fa-user"></i>
                    </div>
                    <div style="flex: 1;">
                        <h2 style="margin: 0;">João da Silva</h2>
                        <span style="color: gray;">3º Ano A • Matrícula: 20240156</span>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge bg-red" style="font-size: 1em; padding: 8px 15px;">🔴 Prioridade Máxima</span>
                    </div>
                </div>

                <div class="student-tabs">
                    <div class="tab active" onclick="switchTab('resumo')">Resumo</div>
                    <div class="tab" onclick="switchTab('notas')">Notas & Freq.</div>
                    <div class="tab" onclick="switchTab('ocorrencias')">Ocorrências</div>
                    <div class="tab" onclick="switchTab('sondagem')">Sondagens</div>
                    <div class="tab" onclick="switchTab('evidencias')">Evidências (Anexos)</div>
                </div>

                <div id="tab-resumo" class="tab-content active">
                    <div class="cards-grid">
                        <div class="card">
                            <h4>Frequência Geral</h4>
                            <div class="number" style="color: var(--danger)">78%</div>
                            <small>Abaixo da meta de 85%</small>
                        </div>
                        <div class="card">
                            <h4>Nível de Leitura</h4>
                            <div class="number" style="font-size: 1.5em; color: var(--warning)">Silábico</div>
                            <small>Alfabetiza Pará</small>
                        </div>
                    </div>
                    <h4 style="margin-top: 20px;">Observações Recentes</h4>
                    <p style="background: white; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid var(--warning);">
                        "Aluno apresenta dificuldade em decodificar sílabas complexas. Responsáveis notificados." <br>
                        <small style="color: gray;">- 20/05/2024 (Coordenação)</small>
                    </p>
                </div>

                <div id="tab-sondagem" class="tab-content">
                    <h3>Histórico Alfabetiza Pará</h3>
                    <table style="width: 100%; margin-top: 15px; border-collapse: collapse; background: white;">
                        <tr style="background: #eee; text-align: left;">
                            <th style="padding: 10px;">Data</th>
                            <th style="padding: 10px;">Nível</th>
                            <th style="padding: 10px;">Avaliador</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">10/02/2024</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Pré-Silábico</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Prof. Ana</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">15/05/2024</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Silábico</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Coord. Maria</td>
                        </tr>
                    </table>
                </div>

                <div id="tab-evidencias" class="tab-content">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>Portfólio Digital</h3>
                        <button class="btn-primary" style="width: auto;">+ Upload</button>
                    </div>
                    <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div style="background: white; padding: 10px; border-radius: 8px; text-align: center;">
                            <i class="fas fa-image" style="font-size: 2em; color: var(--accent); margin-bottom: 10px;"></i>
                            <p>Foto_Atividade.jpg</p>
                            <small>15/05/2024</small>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 8px; text-align: center;">
                            <i class="fas fa-microphone" style="font-size: 2em; color: var(--warning); margin-bottom: 10px;"></i>
                            <p>Leitura_Audio.mp3</p>
                            <small>10/05/2024</small>
                        </div>
                    </div>
                </div>
            </div>
             <div id="view-reports" class="view-section hidden">
                <h2>Relatórios e Indicadores</h2>
                <div class="cards-grid" style="margin-top: 20px;">
                    <div class="card" style="cursor: pointer;">
                        <i class="fas fa-file-pdf" style="font-size: 2em; color: var(--danger); margin-bottom: 10px;"></i>
                        <h4>Alunos em Risco</h4>
                        <small>Gerar PDF</small>
                    </div>
                    <div class="card" style="cursor: pointer;">
                        <i class="fas fa-table" style="font-size: 2em; color: var(--success); margin-bottom: 10px;"></i>
                        <h4>Resultados Alfabetiza Pará</h4>
                        <small>Exportar Excel</small>
                    </div>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px; height: 200px; display: flex; align-items: center; justify-content: center; border: 2px dashed #ddd;">
                    <p style="color: gray;">[Gráfico: Evolução de Leitura por Turma]</p>
                </div>
            </div>

        </main>
    </div>

    <script>
        // Lógica simples de navegação (SPA simulada)
        function login() {
            document.getElementById('login-screen').style.display = 'none';
            const app = document.getElementById('app-container');
            // Remove qualquer classe que possa estar conflitando e força o display flex
            app.classList.remove('hidden'); 
            app.style.display = 'flex'; 
            
            navigate('dashboard');
        }

        function navigate(viewId) {
            // Esconder todas as views
            const views = document.querySelectorAll('.view-section');
            views.forEach(v => v.classList.add('hidden'));

            // Remover classe active do menu lateral
            const navItems = document.querySelectorAll('nav li');
            navItems.forEach(n => n.classList.remove('active'));

            // Mostrar a view desejada
            const target = document.getElementById('view-' + viewId);
            if (target) {
                target.classList.remove('hidden');
                
                // Atualizar Título
                const titles = {
                    'dashboard': 'Visão Geral',
                    'agenda': 'Agenda e Planejamento',
                    'schools': 'Gestão de Escolas',
                    'classes': 'Gestão de Turmas',
                    'students': 'Gestão de Alunos',
                    'student-detail': 'Detalhes do Aluno',
                    'reports': 'Relatórios',
                    'settings': 'Configurações'
                };
                document.getElementById('page-title').innerText = titles[viewId] || 'SACP';
            }

            // Ativar item no menu (se existir)
            const navItem = document.getElementById('nav-' + viewId);
            if (navItem) navItem.classList.add('active');
        }

        // Simulação de navegação hierárquica
        function selectSchool(schoolName) {
            document.getElementById('selected-school-title').innerText = "Turmas - " + schoolName;
            navigate('classes');
            // Hack para manter "Escolas" ativo no menu, já que "Classes" é filho
            document.getElementById('nav-schools').classList.add('active');
            document.getElementById('nav-classes').classList.remove('active'); 
        }

        function selectClass(className) {
            navigate('students');
             // Hack visual de hierarquia
             document.getElementById('nav-schools').classList.add('active');
             document.getElementById('nav-students').classList.remove('active');
        }

        function selectStudent() {
            navigate('student-detail');
             // Hack visual de hierarquia
             document.getElementById('nav-schools').classList.add('active');
        }

        // Lógica de Abas
        function switchTab(tabName) {
            // Resetar abas
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(t => t.classList.remove('active'));
            
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(c => c.classList.remove('active'));

            // Ativar a selecionada
            event.target.classList.add('active');
            
            const targetContent = document.getElementById('tab-' + tabName);
            if(targetContent) targetContent.classList.add('active');
        }
    </script>
</body>
</html>