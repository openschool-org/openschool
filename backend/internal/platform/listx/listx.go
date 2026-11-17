// Package listx holds small generic helpers for turning query results into module types.
package listx

// Map runs a list query and maps every row; on error it returns nil and the error.
func Map[T, U any](query func() ([]T, error), mapRow func(T) U) ([]U, error) {
	rows, err := query()
	if err != nil {
		return nil, err
	}
	out := make([]U, len(rows))
	for i, row := range rows {
		out[i] = mapRow(row)
	}
	return out, nil
}
