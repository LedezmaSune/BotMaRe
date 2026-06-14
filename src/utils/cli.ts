// Colores ANSI
export const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",

    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        gray: "\x1b[90m",
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
    }
};

export class Spinner {
    private timer: NodeJS.Timeout | null = null;
    private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    private currentFrame = 0;
    private message: string = "";

    constructor(message: string) {
        this.message = message;
    }

    start() {
        if (this.timer) return;
        process.stdout.write("\x1B[?25l"); // Ocultar cursor
        this.timer = setInterval(() => {
            process.stdout.write(`\r${colors.fg.cyan}${this.frames[this.currentFrame]}${colors.reset} ${this.message}`);
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }, 80);
    }

    succeed(newMessage?: string) {
        this.stop();
        console.log(`\r${colors.fg.green}✔${colors.reset} ${newMessage || this.message}`);
    }

    fail(newMessage?: string) {
        this.stop();
        console.log(`\r${colors.fg.red}✖${colors.reset} ${newMessage || this.message}`);
    }

    info(newMessage?: string) {
        this.stop();
        console.log(`\r${colors.fg.blue}ℹ${colors.reset} ${newMessage || this.message}`);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            process.stdout.write("\x1B[?25h"); // Mostrar cursor
            process.stdout.write("\r\x1b[K"); // Limpiar la línea actual
        }
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let hasAnimatedLogo = false;

export async function drawBanner() {
    console.clear();
    const logoLines = [
        colors.fg.cyan + "    ██████╗  ██████╗ ████████╗███╗   ███╗███████╗██████╗ " + colors.reset,
        colors.fg.cyan + "    ██╔══██╗██╔═══██╗╚══██╔══╝████╗ ████║██╔════╝██╔══██╗" + colors.reset,
        colors.fg.cyan + "    ██████╦╝██║   ██║   ██║   ██╔████╔██║█████╗  ██████╔╝" + colors.reset,
        colors.fg.cyan + "    ██╔══██╗██║   ██║   ██║   ██║╚██╔╝██║██╔══╝  ██╔══██╗" + colors.reset,
        colors.fg.cyan + "    ██████╦╝╚██████╔╝   ██║   ██║ ╚═╝ ██║███████╗██║  ██║" + colors.reset,
        colors.fg.cyan + "    ╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝" + colors.reset
    ];

    if (!hasAnimatedLogo) {
        for (const line of logoLines) {
            console.log(line);
            await sleep(80);
        }
        hasAnimatedLogo = true;
    } else {
        for (const line of logoLines) {
            console.log(line);
        }
    }

    const title = "Unified Modular Engine";
    const titleSpace = " ".repeat(Math.max(0, (55 - title.length) / 2));
    
    console.log(`\n${colors.fg.magenta}    ╭───────────────────────────────────────────────────────╮${colors.reset}`);
    console.log(`${colors.fg.magenta}    │${titleSpace}${colors.bright}${title}${colors.reset}${titleSpace}  ${colors.fg.magenta}│${colors.reset}`);
    console.log(`${colors.fg.magenta}    ╰───────────────────────────────────────────────────────╯${colors.reset}\n`);
}
