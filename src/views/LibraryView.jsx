import React from 'react';

const LibraryView = ({
  libraryTab,
  setLibraryTab,
  loanForm,
  setLoanForm,
  libraryBooks,
  bookLoans,
  setBookLoans,
  students,
  classes,
  getLocalDateString,
  loanStudentQuery,
  setLoanStudentQuery,
  studentsLoading,
  libraryBookForm,
  setLibraryBookForm,
  setLibraryBooks,
}) => {
  return (
    <div id="view-library" className="view-section">
      <h2>Biblioteca e Empréstimos de Livros</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 20 }}>
        Cadastre livros da escola e controle os empréstimos de forma simples. Os dados desta aba são mantidos
        apenas enquanto a página estiver aberta (sem salvar no banco ainda).
      </p>

      <div className="student-tabs" style={{ marginBottom: 16 }}>
        <div
          className={`tab ${libraryTab === 'loans' ? 'active' : ''}`}
          onClick={() => setLibraryTab('loans')}
        >
          Controle de empréstimos
        </div>
        <div
          className={`tab ${libraryTab === 'books' ? 'active' : ''}`}
          onClick={() => setLibraryTab('books')}
        >
          Cadastro de livros
        </div>
      </div>

      {/* Aba: Controle de empréstimos (padrão) */}
      {libraryTab === 'loans' && (
        <div className="tab-content active">
          <div className="library-panel">
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Controle de empréstimos</h3>
            <p style={{ fontSize: '0.85em', color: 'var(--text-light)', marginBottom: 16 }}>
              Registre quem está com cada livro e a data prevista para devolução.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!loanForm.livroId || !loanForm.alunoId) return;
                const livro = libraryBooks.find((b) => b.id === loanForm.livroId);
                const isAlreadyLoaned = bookLoans.some(
                  (loan) => loan.livroId === loanForm.livroId && !loan.dataDevolucao
                );
                if (isAlreadyLoaned) {
                  alert('Este livro já está emprestado.');
                  return;
                }
                const alunoObj = students.find((s) => String(s.id) === String(loanForm.alunoId));
                const turmaNome = alunoObj
                  ? (classes.find((c) => String(c.id) === String(alunoObj.turma_id))?.nome || '')
                  : '';
                const dataEmprestimo =
                  loanForm.dataEmprestimo || getLocalDateString();
                const newLoan = {
                  id: `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`,
                  livroId: loanForm.livroId,
                  alunoId: loanForm.alunoId,
                  aluno: loanForm.aluno.trim(),
                  alunoNome: alunoObj?.nome || loanForm.aluno.trim(),
                  turmaNome: turmaNome || undefined,
                  dataEmprestimo,
                  dataPrevistaDevolucao: loanForm.dataPrevistaDevolucao,
                  dataDevolucao: null,
                  livroTitulo: livro?.titulo || '',
                  livroCodigo: livro?.codigo || '',
                };
                setBookLoans((prev) => [...prev, newLoan]);
                setLoanForm({
                  livroId: '',
                  alunoId: '',
                  aluno: '',
                  dataEmprestimo: getLocalDateString(),
                  dataPrevistaDevolucao: '',
                });
                setLoanStudentQuery('');
              }}
              className="library-loan-form"
            >
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Livro *</label>
                <select
                  required
                  value={loanForm.livroId}
                  onChange={(e) =>
                    setLoanForm((prev) => ({ ...prev, livroId: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: 'white',
                  }}
                >
                  <option value="">Selecione um livro...</option>
                  {libraryBooks.map((livro) => {
                    const emprestado = bookLoans.some(
                      (loan) => loan.livroId === livro.id && !loan.dataDevolucao
                    );
                    return (
                      <option
                        key={livro.id}
                        value={livro.id}
                        disabled={emprestado}
                      >
                        {livro.titulo}
                        {livro.autor ? ` - ${livro.autor}` : ''}
                        {livro.codigo ? ` (${livro.codigo})` : ''}
                        {emprestado ? ' - (emprestado)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0, position: 'relative' }}>
                <label>Aluno / Turma *</label>
                <input
                  type="text"
                  required
                  value={loanStudentQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLoanStudentQuery(value);
                    setLoanForm((prev) => ({
                      ...prev,
                      alunoId: '',
                      aluno: value,
                    }));
                  }}
                  placeholder="Digite para buscar aluno cadastrado..."
                  autoComplete="off"
                />
                {loanStudentQuery.length >= 2 && (
                  <div className="modal-autocomplete-dropdown">
                    {studentsLoading && (
                      <div style={{ padding: 8, fontSize: '0.85em' }}>Carregando alunos...</div>
                    )}
                    {!studentsLoading &&
                      (students || [])
                        .filter((aluno) =>
                          (aluno.nome || '')
                            .toLowerCase()
                            .includes(loanStudentQuery.toLowerCase())
                        )
                        .slice(0, 15)
                        .map((aluno) => {
                          const turmaNome =
                            classes.find((c) => String(c.id) === String(aluno.turma_id))
                              ?.nome || '';
                          const label = turmaNome
                            ? `${aluno.nome} - ${turmaNome}`
                            : aluno.nome;
                          return (
                            <div
                              key={aluno.id}
                              onClick={() => {
                                setLoanForm((prev) => ({
                                  ...prev,
                                  alunoId: aluno.id,
                                  aluno: label,
                                }));
                                setLoanStudentQuery(label);
                              }}
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.85em',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f3f3',
                                background:
                                  loanForm.alunoId === aluno.id ? '#eef4ff' : 'white',
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{aluno.nome}</div>
                              {turmaNome && (
                                <div style={{ color: '#666' }}>Turma: {turmaNome}</div>
                              )}
                            </div>
                          );
                        })}
                    {!studentsLoading &&
                      (students || []).filter((aluno) =>
                        (aluno.nome || '')
                          .toLowerCase()
                          .includes(loanStudentQuery.toLowerCase())
                      ).length === 0 && (
                        <div style={{ padding: 8, fontSize: '0.85em', color: '#777' }}>
                          Nenhum aluno encontrado com esse nome.
                        </div>
                      )}
                  </div>
                )}
                {loanForm.alunoId && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: '0.8em',
                      color: '#16a34a',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>Aluno selecionado: {loanForm.aluno}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoanForm((prev) => ({ ...prev, alunoId: '', aluno: '' }));
                        setLoanStudentQuery('');
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '0.8em',
                        textDecoration: 'underline',
                      }}
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Data do empréstimo</label>
                <input
                  type="date"
                  value={loanForm.dataEmprestimo}
                  onChange={(e) =>
                    setLoanForm((prev) => ({
                      ...prev,
                      dataEmprestimo: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Data prevista para devolução</label>
                <input
                  type="date"
                  value={loanForm.dataPrevistaDevolucao}
                  onChange={(e) =>
                    setLoanForm((prev) => ({
                      ...prev,
                      dataPrevistaDevolucao: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="library-loan-form__full">
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  disabled={libraryBooks.length === 0}
                  title={
                    libraryBooks.length === 0
                      ? 'Cadastre pelo menos um livro para registrar empréstimos.'
                      : undefined
                  }
                >
                  <i className="fas fa-exchange-alt" style={{ marginRight: 6 }} />
                  Registrar empréstimo
                </button>
              </div>
            </form>

            <h4 style={{ marginBottom: 8, fontSize: '0.95rem' }}>Empréstimos</h4>
            <div className="list-container">
              {bookLoans.length === 0 && (
                <div className="list-item">
                  <span>Nenhum empréstimo registrado.</span>
                </div>
              )}
              {bookLoans.length > 0 &&
                bookLoans.map((loan) => {
                  const isReturned = !!loan.dataDevolucao;
                  let statusLabel = isReturned ? 'Devolvido' : 'Em aberto';
                  let statusColor = isReturned ? '#16a34a' : '#2563eb';
                  if (
                    !isReturned &&
                    loan.dataPrevistaDevolucao &&
                    new Date(loan.dataPrevistaDevolucao) < new Date()
                  ) {
                    statusLabel = 'Em atraso';
                    statusColor = '#dc2626';
                  }
                  const loanAluno = loan.alunoId && (students || []).find((s) => String(s.id) === String(loan.alunoId));
                  const turmaFromAluno = loanAluno && (classes.find((c) => String(c.id) === String(loanAluno.turma_id))?.nome);
                  const turmaFromTexto = (typeof loan.aluno === 'string' && loan.aluno.includes(' - '))
                    ? loan.aluno.split(' - ').slice(1).join(' - ').trim()
                    : '';
                  const exibirTurma = loan.turmaNome || turmaFromAluno || turmaFromTexto || null;
                  const exibirNome = loan.alunoNome || (typeof loan.aluno === 'string' && loan.aluno.includes(' - ') ? loan.aluno.split(' - ')[0].trim() : loan.aluno) || loanAluno?.nome;
                  return (
                    <div key={loan.id} className="list-item">
                      <div style={{ flex: 1 }}>
                        <strong>{loan.livroTitulo || 'Livro'}</strong>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                          <span>
                            {exibirNome}
                            {exibirTurma && (
                              <span style={{ marginLeft: 6, color: '#555' }}>
                                • {exibirTurma}
                              </span>
                            )}
                          </span>
                          {loan.livroCodigo && <span>{` • Cód.: ${loan.livroCodigo}`}</span>}
                        </div>
                        <div style={{ fontSize: '0.75em', color: '#777', marginTop: 2 }}>
                          <span>
                            Saída:{' '}
                            {loan.dataEmprestimo
                              ? new Date(loan.dataEmprestimo).toLocaleDateString('pt-BR')
                              : '-'}
                          </span>
                          {loan.dataPrevistaDevolucao && (
                            <span>
                              {' '}
                              • Prevista:{' '}
                              {new Date(
                                loan.dataPrevistaDevolucao
                              ).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {loan.dataDevolucao && (
                            <span>
                              {' '}
                              • Devolvido em:{' '}
                              {new Date(loan.dataDevolucao).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="list-item-actions" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span
                          style={{
                            fontSize: '0.75em',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: `${statusColor}22`,
                            color: statusColor,
                          }}
                        >
                          {statusLabel}
                        </span>
                        {!isReturned && (
                          <button
                            type="button"
                            className="btn-icon btn-icon--success"
                            style={{ fontSize: '0.8em', width: 'auto', minWidth: 0, padding: '6px 10px' }}
                            onClick={() => {
                              setBookLoans((prev) =>
                                prev.map((l) =>
                                  l.id === loan.id
                                    ? { ...l, dataDevolucao: getLocalDateString() }
                                    : l
                                )
                              );
                            }}
                          >
                            <i className="fas fa-check" style={{ marginRight: 4 }} />
                            Marcar devolução
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Aba: Cadastro de livros */}
      {libraryTab === 'books' && (
        <div className="tab-content active">
          <div className="library-panel">
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Cadastro de livros</h3>
            <p style={{ fontSize: '0.85em', color: 'var(--text-light)', marginBottom: 16 }}>
              Registre aqui os títulos disponíveis para empréstimo.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const titulo = libraryBookForm.titulo.trim();
                const autor = libraryBookForm.autor.trim();
                const codigo = libraryBookForm.codigo.trim();
                if (!titulo) return;
                const newBook = {
                  id: Date.now().toString(),
                  titulo,
                  autor,
                  codigo,
                };
                setLibraryBooks((prev) => [...prev, newBook]);
                setLibraryBookForm({ titulo: '', autor: '', codigo: '' });
              }}
              style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 16 }}
            >
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Título do livro *</label>
                <input
                  type="text"
                  required
                  value={libraryBookForm.titulo}
                  onChange={(e) =>
                    setLibraryBookForm((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                  placeholder="Ex: O Pequeno Príncipe"
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Autor</label>
                <input
                  type="text"
                  value={libraryBookForm.autor}
                  onChange={(e) =>
                    setLibraryBookForm((prev) => ({ ...prev, autor: e.target.value }))
                  }
                  placeholder="Ex: Antoine de Saint-Exupéry"
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Código / Tombo</label>
                <input
                  type="text"
                  value={libraryBookForm.codigo}
                  onChange={(e) =>
                    setLibraryBookForm((prev) => ({ ...prev, codigo: e.target.value }))
                  }
                  placeholder="Ex: 123-A, 2024-001..."
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px', marginTop: 4 }}
              >
                <i className="fas fa-plus" style={{ marginRight: 6 }} />
                Adicionar livro
              </button>
            </form>

            <hr style={{ margin: '10px 0 14px', border: 'none', borderTop: '1px solid #f0f0f0' }} />

            <h4 style={{ marginBottom: 8, fontSize: '0.95rem' }}>Livros cadastrados</h4>
            <div className="list-container">
              {libraryBooks.length === 0 && (
                <div className="list-item">
                  <span>Nenhum livro cadastrado ainda.</span>
                </div>
              )}
              {libraryBooks.length > 0 &&
                libraryBooks.map((livro) => {
                  const emprestado = bookLoans.some(
                    (loan) => loan.livroId === livro.id && !loan.dataDevolucao
                  );
                  return (
                    <div key={livro.id} className="list-item">
                      <div style={{ flex: 1 }}>
                        <strong>{livro.titulo}</strong>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                          {livro.autor && <span>Autor: {livro.autor}</span>}
                          {livro.autor && livro.codigo && <span> • </span>}
                          {livro.codigo && <span>Cód.: {livro.codigo}</span>}
                        </div>
                      </div>
                      <div className="list-item-actions">
                        {emprestado && (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.75em', whiteSpace: 'nowrap' }}
                          >
                            Emprestado
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn-icon btn-icon--danger"
                          style={{ fontSize: '0.8em', minWidth: 0, padding: '6px 10px' }}
                          onClick={() => {
                            const hasActiveLoan = bookLoans.some(
                              (loan) => loan.livroId === livro.id && !loan.dataDevolucao
                            );
                            if (hasActiveLoan) {
                              alert('Este livro possui empréstimo em aberto. Finalize o empréstimo antes de remover.');
                              return;
                            }
                            setLibraryBooks((prev) =>
                              prev.filter((b) => b.id !== livro.id)
                            );
                          }}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
