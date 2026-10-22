interface Props {
  loading: boolean;
  label: string;
  loadingLabel?: string;
}

export default function SubmitButton({ loading, label, loadingLabel = "Un momento…" }: Props) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
