package listx

import (
	"errors"
	"strconv"
	"testing"
)

func TestMap(t *testing.T) {
	got, err := Map(func() ([]int, error) { return []int{1, 2}, nil }, strconv.Itoa)
	if err != nil || len(got) != 2 || got[0] != "1" || got[1] != "2" {
		t.Fatalf("got %v, %v", got, err)
	}
	boom := errors.New("boom")
	got, err = Map(func() ([]int, error) { return nil, boom }, strconv.Itoa)
	if !errors.Is(err, boom) || got != nil {
		t.Fatalf("got %v, %v", got, err)
	}
}
