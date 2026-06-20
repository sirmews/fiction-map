package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/sirmews/fiction-map/packages/protocol/go/generated"
)

// Msg types
type frameMsg generated.Frame
type errMsg error

type model struct {
	frame    generated.Frame
	stdin    io.WriteCloser
	err      error
	selected int
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case frameMsg:
		m.frame = generated.Frame(msg)
		m.selected = 0
		return m, nil

	case errMsg:
		m.err = msg
		return m, tea.Quit

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			m.sendIntent(generated.Intent{Type: "quit"})
			return m, tea.Quit

		case "up":
			if m.selected > 0 {
				m.selected--
			} else {
				m.selected = len(m.frame.Choices) - 1
			}

		case "down":
			if m.selected < len(m.frame.Choices)-1 {
				m.selected++
			} else {
				m.selected = 0
			}

		case "enter":
			if len(m.frame.Choices) > 0 && m.selected >= 0 && m.selected < len(m.frame.Choices) {
				choice := m.frame.Choices[m.selected]
				m.sendIntent(generated.Intent{
					Type:     "selectChoice",
					ChoiceID: choice.ID,
				})
			} else if len(m.frame.Choices) == 0 {
				m.sendIntent(generated.Intent{Type: "quit"})
				return m, tea.Quit
			}

		default:
			// Handle numeric hotkeys 1-9
			if val, err := strconv.Atoi(msg.String()); err == nil {
				idx := val - 1
				if idx >= 0 && idx < len(m.frame.Choices) {
					choice := m.frame.Choices[idx]
					m.sendIntent(generated.Intent{
						Type:     "selectChoice",
						ChoiceID: choice.ID,
					})
				}
			}
		}
	}

	return m, nil
}

func (m model) sendIntent(intent generated.Intent) {
	data, err := json.Marshal(intent)
	if err != nil {
		return
	}
	_, _ = m.stdin.Write(append(data, '\n'))
}

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v\n", m.err)
	}

	if m.frame.CurrentNode.ID == "" {
		return "Connecting to story engine...\n"
	}

	s := "╔════════════════════════════════════════════════════════════╗\n"
	s += "║              FICTION MAP : LITERATURE RPG (GO)             ║\n"
	s += "╚════════════════════════════════════════════════════════════╝\n\n"

	// Render Node Info
	s += fmt.Sprintf("Node: %s (%s)\n\n", m.frame.CurrentNode.ID, m.frame.CurrentNode.Type)

	// Render Blocks
	for _, block := range m.frame.CurrentNode.Blocks {
		if block.Type == "header" {
			s += fmt.Sprintf("\033[1;4m%s\033[0m\n\n", block.Text)
		} else {
			s += fmt.Sprintf("%s\n\n", block.Text)
		}
	}

	// Render Warnings
	for _, warning := range m.frame.Warnings {
		s += fmt.Sprintf("\033[1;5;31m⚠ %s\033[0m\n\n", warning)
	}

	// Render Status HUD
	s += "──────────────────────────────────────────────────────────────\n"
	s += "STATUS: "
	s += fmt.Sprintf("\033[31m♥ HP: %d%%\033[0m  ", int(m.frame.Resources["health"]))
	s += fmt.Sprintf("\033[34m♦ MP: %d/50\033[0m  ", int(m.frame.Resources["mana"]))
	s += fmt.Sprintf("\033[33m⛃ Gold: %dg\033[0m  ", int(m.frame.Resources["gold"]))
	s += fmt.Sprintf("\033[37m⏳ Turn: %d\033[0m\n", int(m.frame.Resources["turns"]))

	// Render Inventory
	if len(m.frame.Inventory) > 0 {
		s += "INVENTORY: "
		for i, item := range m.frame.Inventory {
			if i > 0 {
				s += ", "
			}
			s += fmt.Sprintf("\033[32m%s\033[0m", item.Label)
		}
		s += "\n"
	}
	s += "──────────────────────────────────────────────────────────────\n\n"

	// Render Choices
	if len(m.frame.Choices) > 0 {
		s += "\033[33mWhat do you do?\033[0m\n"
		for i, choice := range m.frame.Choices {
			cursor := "  "
			color := "\033[37m"
			if i == m.selected {
				cursor = "❯ "
				color = "\033[36m"
			}
			s += fmt.Sprintf("%s%s[%d] %s\033[0m\n", cursor, color, i+1, choice.Label)
		}
	} else {
		s += "\033[32m★ Traversal complete! Press [Enter] or [Q] to exit. ★\033[0m\n"
	}

	s += "\n\033[90m[↑/↓] Navigate • [1-9] Quick Hotkey • [Enter] Confirm • [Q] Quit\033[0m\n"
	return s
}

func main() {
	// Spawn the Node stdio sidecar process
	// We run 'bun' directly pointing to the main.ts file
	cmd := exec.Command("bun", "run", "../../apps/literature-rpg/src/main.ts")

	stdin, err := cmd.StdinPipe()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create stdin pipe: %v\n", err)
		os.Exit(1)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create stdout pipe: %v\n", err)
		os.Exit(1)
	}

	if err := cmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start sidecar process: %v\n", err)
		os.Exit(1)
	}

	defer func() {
		_ = stdin.Close()
		_ = cmd.Process.Kill()
	}()

	m := model{
		stdin: stdin,
	}

	p := tea.NewProgram(m, tea.WithAltScreen())

	// Goroutine to read stdout Frames from the sidecar and feed them to Bubble Tea
	go func() {
		reader := bufio.NewReader(stdout)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				if err != io.EOF {
					p.Send(errMsg(err))
				}
				break
			}

			var frame generated.Frame
			if err := json.Unmarshal([]byte(line), &frame); err != nil {
				p.Send(errMsg(err))
				break
			}

			p.Send(frameMsg(frame))
		}
	}()

	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Bubble Tea error: %v\n", err)
		os.Exit(1)
	}
}
