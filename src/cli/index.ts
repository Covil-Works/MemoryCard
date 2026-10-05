import { Command } from 'commander';
import readline from 'node:readline/promises';
import path from 'node:path';
import { ProjectService } from '../core/services/project-service.js';
import { TaskService } from '../core/services/task-service.js';
import { TodoService } from '../core/services/todo-service.js';
import { CommentService } from '../core/services/comment-service.js';
import { StatusService } from '../core/services/status-service.js';
import { readGlobalProjects, unregisterProjectFromGlobalRegistry } from '../storage/project-registry.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('memorycard')
    .description('Plataforma para gerenciamento de memória e estados das tasks de projetos')
    .version('0.1.0')
    .option('-p, --port <port>', 'Porta do servidor web', '3333')
    .option('-H, --host <host>', 'Host de escuta do servidor (padrão: 0.0.0.0 para acesso em rede local)', '0.0.0.0')
    .option('--qr', 'Exibe o QR code no terminal para conexão rápida pelo celular')
    .option('--no-open', 'Não abrir o navegador automaticamente')
    .action(async (options: any) => {
      // memorycard sem argumentos: inicia servidor e abre interface
      try {
        const { startLocalServer } = await import('../server/index.js');
        await startLocalServer({
          port: options.port ? Number(options.port) : 3333,
          host: options.host || '0.0.0.0',
          openBrowser: options.open !== false,
          qr: Boolean(options.qr)
        });
      } catch (err: any) {
        console.error(`Erro ao iniciar servidor: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('ui')
    .description('Inicia o servidor e interface web do MemoryCard')
    .option('-p, --port <port>', 'Porta do servidor web', '3333')
    .option('-H, --host <host>', 'Host de escuta do servidor (padrão: 0.0.0.0 para acesso em rede local)', '0.0.0.0')
    .option('--qr', 'Exibe o QR code no terminal para conexão rápida pelo celular')
    .option('--no-open', 'Não abrir o navegador automaticamente')
    .action(async (options: any) => {
      try {
        const { startLocalServer } = await import('../server/index.js');
        await startLocalServer({
          port: options.port ? Number(options.port) : 3333,
          host: options.host || '0.0.0.0',
          openBrowser: options.open !== false,
          qr: Boolean(options.qr)
        });
      } catch (err: any) {
        console.error(`Erro ao iniciar servidor: ${err.message}`);
        process.exit(1);
      }
    });

  // --- Comandos de Projeto ---

  program
    .command('init [name]')
    .description('Inicializa o diretório atual como projeto MemoryCard')
    .action(async (name?: string) => {
      try {
        const project = await ProjectService.initProject(process.cwd(), name);
        console.log(`Projeto inicializado com sucesso em "${project.rootDir}" (ID: ${project.config.project.id})`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('project')
    .description('Exibe os dados e configuração do projeto atual')
    .action(async () => {
      try {
        const project = await ProjectService.getProject();
        console.log(`Projeto: ${project.config.project.name}`);
        console.log(`ID:      ${project.config.project.id}`);
        console.log(`Slug:    ${project.slug}`);
        console.log(`Root:    ${project.rootDir}`);
        console.log(`Modelo:  ${project.config.task_model}`);
        console.log(`Board:   ${project.config.board.sort}`);
        console.log(`Colunas: ${project.config.columns.map(c => `${c.name} (${c.id})`).join(' -> ')}`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('open')
    .description('Abre diretamente o board do projeto atual no navegador')
    .option('-p, --port <port>', 'Porta do servidor web', '3333')
    .option('-H, --host <host>', 'Host de escuta do servidor (padrão: 0.0.0.0)', '0.0.0.0')
    .option('--qr', 'Exibe o QR code no terminal para conexão rápida pelo celular')
    .action(async (options: any) => {
      try {
        const project = await ProjectService.getProject();
        const { startLocalServer } = await import('../server/index.js');
        await startLocalServer({
          port: options.port ? Number(options.port) : 3333,
          host: options.host || '0.0.0.0',
          openBrowser: true,
          projectSlug: project.slug,
          qr: Boolean(options.qr)
        });
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('projects')
    .description('Lista todos os projetos registrados globalmente no MemoryCard')
    .action(async () => {
      try {
        const { projects } = await readGlobalProjects();
        if (projects.length === 0) {
          console.log('Nenhum projeto registrado no MemoryCard.');
          return;
        }
        console.log('NOME'.padEnd(25) + 'STATUS'.padEnd(14) + 'ID'.padEnd(38) + 'CAMINHO');
        console.log('-'.repeat(95));
        for (const p of projects) {
          const status = p.available ? 'DISPONÍVEL' : 'INDISPONÍVEL';
          console.log((p.name || '-').padEnd(25) + status.padEnd(14) + p.project_id.padEnd(38) + p.path);
        }
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('forget <id>')
    .description('Remove um projeto da lista global sem apagar arquivos locais')
    .action(async (id: string) => {
      try {
        const removed = await unregisterProjectFromGlobalRegistry(id);
        if (removed) {
          console.log(`Projeto "${id}" removido do registro global com sucesso.`);
        } else {
          console.error(`Projeto com ID "${id}" não encontrado no registro global.`);
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  // --- Comandos de Consulta ---

  program
    .command('list')
    .description('Lista as tasks do projeto atual')
    .option('-s, --status <status>', 'Filtrar por status')
    .option('--sort <sort>', 'Tipo de ordenação (updated_at | alphabetical | custom)')
    .action(async (options: any) => {
      try {
        const project = await ProjectService.getProject();
        const tasks = await TaskService.listTasks(project.rootDir, {
          status: options.status,
          sort: options.sort
        });

        if (tasks.length === 0) {
          console.log('Nenhuma task encontrada.');
          return;
        }

        console.log('ID'.padEnd(6) + 'STATUS'.padEnd(16) + 'TITLE'.padEnd(40) + 'UPDATED');
        console.log('-'.repeat(80));
        for (const task of tasks) {
          const idStr = `#${task.id}`.padEnd(6);
          const statusStr = task.status.padEnd(16);
          const titleStr = (task.title.length > 36 ? task.title.slice(0, 33) + '...' : task.title).padEnd(40);
          const updatedStr = task.updated_at.split('T')[0] + ' ' + task.updated_at.split('T')[1]?.slice(0, 5);
          console.log(`${idStr}${statusStr}${titleStr}${updatedStr}`);
        }
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('show <id>')
    .description('Exibe a task completa')
    .action(async (idStr: string) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        if (isNaN(id)) {
          console.error('ID deve ser numérico.');
          process.exit(1);
        }

        const task = await TaskService.getTask(project.rootDir, id);
        console.log(`Task #${task.id}: ${task.title}`);
        console.log(`Status:    ${task.status}`);
        console.log(`Posição:   ${task.position}`);
        console.log(`Criada em: ${task.created_at}`);
        console.log(`Atualizada:${task.updated_at}`);
        console.log('\n--- Descrição ---');
        console.log(task.description || '(Sem descrição)');

        console.log('\n--- Todos ---');
        if (task.todos.length === 0) {
          console.log('(Nenhum todo)');
        } else {
          task.todos.forEach((t, i) => {
            console.log(`${i + 1}. [${t.completed ? 'x' : ' '}] ${t.text}`);
          });
        }

        console.log('\n--- Comentários ---');
        if (task.comments.length === 0) {
          console.log('(Nenhum comentário)');
        } else {
          for (const c of task.comments) {
            console.log(`[${c.timestamp}] ${c.text}`);
          }
        }
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('current')
    .description('Retorna a task em "in-progress" mais recentemente atualizada')
    .action(async () => {
      try {
        const project = await ProjectService.getProject();
        const task = await TaskService.getCurrentTask(project.rootDir);
        if (!task) {
          console.log('Nenhuma task em andamento (in-progress) no momento.');
          return;
        }

        console.log(`Task #${task.id}: ${task.title}`);
        console.log(`Status: ${task.status} | Atualizada em: ${task.updated_at}`);
        console.log(`\n${task.description || ''}`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('resume <id>')
    .description('Retorna a task formatada para retomada por um coding agent')
    .action(async (idStr: string) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        if (isNaN(id)) {
          console.error('ID deve ser numérico.');
          process.exit(1);
        }

        const resume = await TaskService.getResumeTask(project.rootDir, id);
        console.log(resume);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  // --- Comandos de Task ---

  program
    .command('create [title]')
    .description('Cria uma nova task')
    .option('-t, --title <title>', 'Título da task')
    .option('-d, --description <desc>', 'Descrição da task')
    .option('-s, --status <status>', 'Status inicial')
    .option('-m, --model <model>', 'Modelo de task a utilizar')
    .action(async (argTitle: string | undefined, options: any) => {
      try {
        const project = await ProjectService.getProject();

        let finalTitle = argTitle || options.title;
        let finalDescription = options.description;

        // Suporte a stdin se title não informado (§25)
        if (!finalTitle && !process.stdin.isTTY) {
          const stdinData = await new Promise<string>((resolve) => {
            let data = '';
            process.stdin.setEncoding('utf-8');
            process.stdin.on('data', chunk => data += chunk);
            process.stdin.on('end', () => resolve(data.trim()));
            process.stdin.resume();
          });

          if (stdinData) {
            const lines = stdinData.split('\n');
            finalTitle = lines[0].replace(/^#*\s*/, '').trim();
            if (lines.length > 1 && !finalDescription) {
              finalDescription = lines.slice(1).join('\n').trim();
            }
          }
        }

        if (!finalTitle) {
          console.error('Erro: Título da task é obrigatório (via argumento, --title ou stdin).');
          process.exit(1);
        }

        const task = await TaskService.createTask(project.rootDir, {
          title: finalTitle,
          description: finalDescription,
          status: options.status,
          modelName: options.model
        });

        console.log(`Task #${task.id} criada com sucesso: "${task.title}" (${task.status})`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('edit <id>')
    .description('Edita os campos informados de uma task existente')
    .option('-t, --title <title>', 'Novo título')
    .option('-d, --description <desc>', 'Nova descrição')
    .option('-s, --status <status>', 'Novo status')
    .action(async (idStr: string, options: any) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        if (isNaN(id)) {
          console.error('ID deve ser numérico.');
          process.exit(1);
        }

        if (options.title === undefined && options.description === undefined && options.status === undefined) {
          console.error('Informe pelo menos um campo para editar (--title, --description ou --status).');
          process.exit(1);
        }

        const updated = await TaskService.updateTask(project.rootDir, id, {
          title: options.title,
          description: options.description,
          status: options.status
        });

        console.log(`Task #${updated.id} atualizada com sucesso.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('delete <id>')
    .description('Exclui uma task existente (com confirmação)')
    .option('-y, --yes', 'Confirmar exclusão sem perguntar')
    .option('-f, --force', 'Confirmar exclusão sem perguntar')
    .action(async (idStr: string, options: any) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        if (isNaN(id)) {
          console.error('ID deve ser numérico.');
          process.exit(1);
        }

        // Verifica existência antes de confirmar
        await TaskService.getTask(project.rootDir, id);

        if (!options.yes && !options.force && process.stdin.isTTY) {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const answer = await rl.question(`Tem certeza que deseja excluir a task #${id}? [y/N]: `);
          rl.close();
          if (answer.trim().toLowerCase() !== 'y' && answer.trim().toLowerCase() !== 's') {
            console.log('Operação cancelada.');
            return;
          }
        }

        await TaskService.deleteTask(project.rootDir, id);
        console.log(`Task #${id} excluída com sucesso.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command('move <id> <status>')
    .description('Move a task para outro status/coluna')
    .action(async (idStr: string, status: string) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        if (isNaN(id)) {
          console.error('ID deve ser numérico.');
          process.exit(1);
        }

        const task = await TaskService.moveTask(project.rootDir, id, status);
        console.log(`Task #${task.id} movida para "${task.status}".`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  // --- Comandos de Todo ---

  const todoCmd = program.command('todo').description('Gerenciamento de checklist da task');

  todoCmd
    .command('add <id> <texto>')
    .description('Adiciona um item ao checklist da task')
    .action(async (idStr: string, texto: string) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        await TodoService.addTodo(project.rootDir, id, texto);
        console.log(`Todo adicionado à task #${id}.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  todoCmd
    .command('done <id> <n>')
    .description('Marca o item <n> (1-based) como concluído')
    .action(async (idStr: string, nStr: string) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        const n = Number(nStr);
        await TodoService.doneTodo(project.rootDir, id, n);
        console.log(`Todo #${n} marcado como concluído na task #${id}.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  todoCmd
    .command('undo <id> <n>')
    .description('Desmarca o item <n> (1-based)')
    .action(async (idStr: string, nStr: string) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        const n = Number(nStr);
        await TodoService.undoTodo(project.rootDir, id, n);
        console.log(`Todo #${n} desmarcado na task #${id}.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  todoCmd
    .command('remove <id> <n>')
    .description('Remove o item <n> (1-based) do checklist')
    .action(async (idStr: string, nStr: string) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        const n = Number(nStr);
        await TodoService.removeTodo(project.rootDir, id, n);
        console.log(`Todo #${n} removido da task #${id}.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  // --- Comandos de Comentários ---

  program
    .command('comment <id> <texto>')
    .description('Adiciona um comentário à task')
    .action(async (idStr: string, texto: string) => {
      try {
        const project = await ProjectService.getProject();
        const id = Number(idStr);
        await CommentService.addComment(project.rootDir, id, texto);
        console.log(`Comentário adicionado à task #${id}.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  // --- Comandos de Status ---

  const statusCmd = program.command('status').description('Gerenciamento de colunas/status do projeto');

  statusCmd
    .command('list')
    .description('Lista os status configurados para o projeto')
    .action(async () => {
      try {
        const project = await ProjectService.getProject();
        const columns = await StatusService.listStatuses(project.rootDir);
        console.log('ORDEM'.padEnd(8) + 'ID'.padEnd(16) + 'NOME');
        console.log('-'.repeat(40));
        for (const col of columns) {
          console.log(`${String(col.order).padEnd(8)}${col.id.padEnd(16)}${col.name}`);
        }
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  statusCmd
    .command('add <name> [id]')
    .description('Adiciona uma nova coluna/status ao projeto')
    .action(async (name: string, customId?: string) => {
      try {
        const project = await ProjectService.getProject();
        const col = await StatusService.addStatus(project.rootDir, name, customId);
        console.log(`Status "${col.name}" (${col.id}) adicionado com sucesso.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  statusCmd
    .command('rename <id> <newName>')
    .description('Renomeia um status existente')
    .action(async (id: string, newName: string) => {
      try {
        const project = await ProjectService.getProject();
        const col = await StatusService.renameStatus(project.rootDir, id, newName);
        console.log(`Status "${id}" renomeado para "${col.name}".`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  statusCmd
    .command('remove <id>')
    .description('Remove um status que não possua tasks vinculadas')
    .action(async (id: string) => {
      try {
        const project = await ProjectService.getProject();
        await StatusService.removeStatus(project.rootDir, id);
        console.log(`Status "${id}" removido com sucesso.`);
      } catch (err: any) {
        console.error(`Erro: ${err.message}`);
        process.exit(1);
      }
    });

  return program;
}

// Execução direta
const scriptPath = process.argv[1] ? path.normalize(process.argv[1]) : '';
if (
  scriptPath.endsWith(path.normalize('src/cli/index.ts')) ||
  scriptPath.endsWith(path.normalize('src/cli/index.js')) ||
  scriptPath.endsWith(path.normalize('bin/memorycard.js'))
) {
  createCli().parse(process.argv);
}
