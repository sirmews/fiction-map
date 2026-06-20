package go_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/sirmews/fiction-map/packages/protocol/go/generated"
)

func TestGoldenFixtureConformance(t *testing.T) {
	t.Run("round-trips the Frame golden fixture successfully", func(t *testing.T) {
		path := filepath.Join("..", "fixtures", "frame_standard.json")
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("Failed to read frame fixture: %v", err)
		}

		var frame generated.Frame
		if err := json.Unmarshal(data, &frame); err != nil {
			t.Fatalf("Failed to unmarshal frame JSON: %v", err)
		}

		// Verify key fields are populated correctly
		if frame.CurrentNode.ID != "entrance" {
			t.Errorf("Expected CurrentNode.ID to be 'entrance', got '%s'", frame.CurrentNode.ID)
		}
		if len(frame.Choices) != 1 || frame.Choices[0].ID != "proceed" {
			t.Errorf("Expected choices to contain 'proceed'")
		}
		if frame.Resources["health"] != 100 {
			t.Errorf("Expected resources['health'] to be 100, got %f", frame.Resources["health"])
		}
		if len(frame.Inventory) != 1 || frame.Inventory[0].ID != "lantern" {
			t.Errorf("Expected inventory to contain 'lantern'")
		}
		if frame.Pacing.PacingIndex != 0 || frame.Pacing.IsComplete {
			t.Errorf("Expected pacing index 0 and incomplete pacing")
		}

		// Marshal back to JSON to ensure round-trip validity
		_, err = json.Marshal(frame)
		if err != nil {
			t.Fatalf("Failed to marshal frame back to JSON: %v", err)
		}
	})

	t.Run("round-trips the Intent golden fixture successfully", func(t *testing.T) {
		path := filepath.Join("..", "fixtures", "intent_select_choice.json")
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("Failed to read intent fixture: %v", err)
		}

		var intent generated.Intent
		if err := json.Unmarshal(data, &intent); err != nil {
			t.Fatalf("Failed to unmarshal intent JSON: %v", err)
		}

		if intent.Type != "selectChoice" {
			t.Errorf("Expected Type to be 'selectChoice', got '%s'", intent.Type)
		}
		if intent.ChoiceID != "proceed" {
			t.Errorf("Expected ChoiceID to be 'proceed', got '%s'", intent.ChoiceID)
		}

		_, err = json.Marshal(intent)
		if err != nil {
			t.Fatalf("Failed to marshal intent back to JSON: %v", err)
		}
	})
}
