package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/sirmews/fiction-map/packages/protocol/go/generated"
)

// Msg types
type frameMsg generated.Frame
type errMsg error

type httpResponseMsg struct {
	frame     generated.Frame
	sessionId string
}

type model struct {
	frame         generated.Frame
	stdin         io.WriteCloser
	err           error
	selected      int
	statusMessage string
	host          string
	sessionId     string
}

var (
	// Colors
	magenta = lipgloss.Color("205")
	cyan    = lipgloss.Color("86")
	yellow  = lipgloss.Color("220")
	red     = lipgloss.Color("196")
	blue    = lipgloss.Color("33")
	green   = lipgloss.Color("120")
	gray    = lipgloss.Color("240")
	white   = lipgloss.Color("255")

	// Styles
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("0")).
			Background(magenta).
			Padding(0, 2)

	nodeStyle = lipgloss.NewStyle().
			Foreground(gray).
			Italic(true)

	headerBlockStyle = lipgloss.NewStyle().
				Bold(true).
				Underline(true).
				Foreground(white).
				MarginBottom(1)

	paragraphBlockStyle = lipgloss.NewStyle().
				Foreground(white).
				MarginBottom(1)

	warningStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(white).
			Background(red).
			Padding(0, 1).
			MarginBottom(1)

	hudTitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(cyan).
			Underline(true).
			MarginBottom(1)

	hudBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(cyan).
			Padding(1, 2).
			Width(32)

	choiceTitleStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(yellow).
				MarginBottom(1)

	selectedChoiceStyle = lipgloss.NewStyle().
				Foreground(cyan).
				Bold(true)

	normalChoiceStyle = lipgloss.NewStyle().
				Foreground(white)

	footerStyle = lipgloss.NewStyle().
			Foreground(gray).
			MarginTop(1)
)

func renderProgressBar(current, max int, fillChar, emptyChar string, length int) string {
	if max <= 0 {
		return fmt.Sprintf("[%s]", strings.Repeat(emptyChar, length))
	}
	clampedCurrent := current
	if clampedCurrent < 0 {
		clampedCurrent = 0
	} else if clampedCurrent > max {
		clampedCurrent = max
	}
	filledLength := int(float64(clampedCurrent) / float64(max) * float64(length))
	emptyLength := length - filledLength
	return fmt.Sprintf("[%s%s]", strings.Repeat(fillChar, filledLength), strings.Repeat(emptyChar, emptyLength))
}

func sendIntentCmd(host string, sessionId string, intent *generated.Intent) tea.Cmd {
	return func() tea.Msg {
		reqBody := map[string]interface{}{
			"sessionId": sessionId,
		}
		if intent != nil {
			reqBody["intent"] = intent
		}
		data, err := json.Marshal(reqBody)
		if err != nil {
			return errMsg(err)
		}

		resp, err := http.Post(host+"/intent", "application/json", bytes.NewBuffer(data))
		if err != nil {
			return errMsg(err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return errMsg(fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(body)))
		}

		var result struct {
			Frame     generated.Frame `json:"frame"`
			SessionID string          `json:"sessionId"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return errMsg(err)
		}

		return httpResponseMsg{
			frame:     result.Frame,
			sessionId: result.SessionID,
		}
	}
}

func (m model) Init() tea.Cmd {
	if m.host != "" {
		return sendIntentCmd(m.host, "", nil)
	}
	return nil
}

func (m *model) handleIntent(intent generated.Intent) tea.Cmd {
	if m.host != "" {
		return sendIntentCmd(m.host, m.sessionId, &intent)
	}
	data, err := json.Marshal(intent)
	if err == nil {
		_, _ = m.stdin.Write(append(data, '\n'))
	}
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case frameMsg:
		m.frame = generated.Frame(msg)
		m.selected = 0
		return m, nil

	case httpResponseMsg:
		m.frame = msg.frame
		m.sessionId = msg.sessionId
		m.selected = 0
		return m, nil

	case errMsg:
		m.err = msg
		return m, tea.Quit

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			cmd := m.handleIntent(generated.Intent{Type: "quit"})
			return m, tea.Batch(cmd, tea.Quit)

		case "up":
			m.statusMessage = ""
			if m.selected > 0 {
				m.selected--
			} else {
				m.selected = len(m.frame.Choices) - 1
			}

		case "down":
			m.statusMessage = ""
			if m.selected < len(m.frame.Choices)-1 {
				m.selected++
			} else {
				m.selected = 0
			}

		case "enter":
			m.statusMessage = ""
			if len(m.frame.Choices) > 0 && m.selected >= 0 && m.selected < len(m.frame.Choices) {
				choice := m.frame.Choices[m.selected]
				cmd := m.handleIntent(generated.Intent{
					Type:     "selectChoice",
					ChoiceID: choice.ID,
				})
				return m, cmd
			} else if len(m.frame.Choices) == 0 {
				cmd := m.handleIntent(generated.Intent{Type: "quit"})
				return m, tea.Batch(cmd, tea.Quit)
			}

		case "s", "S":
			if m.frame.SerializedState != "" {
				err := os.WriteFile("save_slot1.json", []byte(m.frame.SerializedState), 0644)
				if err != nil {
					m.statusMessage = fmt.Sprintf("Failed to save: %v", err)
				} else {
					m.statusMessage = "Game saved to Slot 1!"
				}
			}
			return m, nil

		case "l", "L":
			data, err := os.ReadFile("save_slot1.json")
			if err != nil {
				m.statusMessage = "No save file found in Slot 1."
			} else {
				cmd := m.handleIntent(generated.Intent{
					Type:            "load",
					SerializedState: string(data),
				})
				m.statusMessage = "Game loaded from Slot 1!"
				return m, cmd
			}
			return m, nil

		default:
			// Handle numeric hotkeys 1-9
			if val, err := strconv.Atoi(msg.String()); err == nil {
				idx := val - 1
				if idx >= 0 && idx < len(m.frame.Choices) {
					choice := m.frame.Choices[idx]
					cmd := m.handleIntent(generated.Intent{
						Type:     "selectChoice",
						ChoiceID: choice.ID,
					})
					return m, cmd
				}
			}
		}
	}

	return m, nil
}

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v\n", m.err)
	}

	if m.frame.CurrentNode.ID == "" {
		return "Connecting to story engine...\n"
	}

	// 1. Header
	header := lipgloss.JoinHorizontal(
		lipgloss.Center,
		titleStyle.Render(" FICTION MAP : LITERATURE RPG "),
		"  ",
		nodeStyle.Render(fmt.Sprintf("Node: %s (%s)", m.frame.CurrentNode.ID, m.frame.CurrentNode.Type)),
	) + "\n\n"

	// 2. Left Panel: Story Text & Warnings
	var leftBuilder strings.Builder
	for _, block := range m.frame.CurrentNode.Blocks {
		if block.Type == "header" {
			leftBuilder.WriteString(headerBlockStyle.Render(block.Text) + "\n")
		} else {
			leftBuilder.WriteString(paragraphBlockStyle.Render(block.Text) + "\n")
		}
	}

	// Warnings
	for _, warning := range m.frame.Warnings {
		leftBuilder.WriteString("\n" + warningStyle.Render("⚠ "+warning) + "\n")
	}

	// Status Message
	if m.statusMessage != "" {
		leftBuilder.WriteString("\n" + lipgloss.NewStyle().Foreground(green).Bold(true).Render(m.statusMessage) + "\n")
	}

	// 3. Right Panel: Player Status HUD
	var rightBuilder strings.Builder
	rightBuilder.WriteString(hudTitleStyle.Render("PLAYER STATUS") + "\n")

	hp := int(m.frame.Resources["health"])
	mp := int(m.frame.Resources["mana"])
	gold := int(m.frame.Resources["gold"])
	turns := int(m.frame.Resources["turns"])
	cooldown := int(m.frame.Resources["heal_cooldown"])

	// HP Bar
	hpBar := renderProgressBar(hp, 100, "█", "░", 10)
	rightBuilder.WriteString(fmt.Sprintf("\033[31m♥ HP\033[0m   %s %d%%\n", hpBar, hp))

	// MP Bar
	mpBar := renderProgressBar(mp, 50, "█", "░", 10)
	rightBuilder.WriteString(fmt.Sprintf("\033[34m♦ MP\033[0m   %s %d/50\n", mpBar, mp))

	// Gold & Turn
	rightBuilder.WriteString(fmt.Sprintf("\033[33m⛃ Gold\033[0m : %dg\n", gold))
	rightBuilder.WriteString(fmt.Sprintf("\033[37m⏳ Turn\033[0m : %d\n", turns))

	// Cooldown
	if cooldown > 0 {
		rightBuilder.WriteString(fmt.Sprintf("\n\033[33m⏳ CD: %d turns left\033[0m\n", cooldown))
	} else {
		rightBuilder.WriteString("\n\033[32m★ Spell Cast Ready\033[0m\n")
	}

	// Inventory
	rightBuilder.WriteString("\n" + hudTitleStyle.Render("INVENTORY") + "\n")
	if len(m.frame.Inventory) > 0 {
		for _, item := range m.frame.Inventory {
			symbol := "•"
			color := "\033[32m" // green
			if strings.Contains(item.ID, "spell") {
				symbol = "★"
				color = "\033[36m" // cyan
			} else if item.ID == "lantern" {
				symbol = "⛯"
				color = "\033[33m" // yellow
			} else if item.ID == "elixir" || item.ID == "spirit-elixir" {
				symbol = "⚗"
				color = "\033[35m" // magenta
			} else if item.ID == "lockpick" {
				symbol = "⚿"
				color = "\033[90m" // gray
			} else if item.ID == "silver-shield" {
				symbol = "⛨"
				color = "\033[37m" // white
			} else if item.ID == "rune-of-water" {
				symbol = "≈"
				color = "\033[34m" // blue
			} else if item.ID == "key" || item.ID == "obsidian-key" {
				symbol = "🗝"
				color = "\033[33m" // yellow
			}
			rightBuilder.WriteString(fmt.Sprintf("%s%s %s\033[0m\n", color, symbol, item.Label))
		}
	} else {
		rightBuilder.WriteString("\033[90mEmpty backpack\033[0m\n")
	}

	// 4. Join Panels Side-by-Side
	leftPanel := lipgloss.NewStyle().Width(45).Render(leftBuilder.String())
	rightPanel := hudBoxStyle.Render(rightBuilder.String())
	mainContent := lipgloss.JoinHorizontal(lipgloss.Top, leftPanel, "    ", rightPanel) + "\n\n"

	// 5. Bottom Panel: Choices & Help
	var bottomBuilder strings.Builder
	if len(m.frame.Choices) > 0 {
		bottomBuilder.WriteString(choiceTitleStyle.Render("What do you do?") + "\n")
		for i, choice := range m.frame.Choices {
			cursor := "  "
			if i == m.selected {
				cursor = "❯ "
				bottomBuilder.WriteString(selectedChoiceStyle.Render(fmt.Sprintf("%s[%d] %s", cursor, i+1, choice.Label)) + "\n")
			} else {
				bottomBuilder.WriteString(normalChoiceStyle.Render(fmt.Sprintf("%s[%d] %s", cursor, i+1, choice.Label)) + "\n")
			}
		}
	} else {
		bottomBuilder.WriteString(lipgloss.NewStyle().Foreground(green).Bold(true).Render("★ Traversal complete! Press [Enter] or [Q] to exit. ★") + "\n")
	}

	bottomBuilder.WriteString(footerStyle.Render("[↑/↓] Navigate • [1-9] Quick Hotkey • [S] Save • [L] Load • [Enter] Confirm • [Q] Quit"))

	// 6. Combine everything inside a gorgeous rounded border
	screen := lipgloss.JoinVertical(lipgloss.Left, header, mainContent, bottomBuilder.String())
	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(magenta).
		Padding(1, 2).
		Render(screen) + "\n"
}

func main() {
	hostFlag := flag.String("host", "", "HTTP host of the story engine (e.g. http://localhost:8080)")
	flag.Parse()

	host := *hostFlag

	var m model
	m.host = host

	if host == "" {
		// Spawn the Node stdio sidecar process
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

		m.stdin = stdin

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
	} else {
		p := tea.NewProgram(m, tea.WithAltScreen())
		if _, err := p.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Bubble Tea error: %v\n", err)
			os.Exit(1)
		}
	}
}
