import EmptyState from "../components/EmptyState.jsx";

export default function Customers() {
  return (
    <div>
      <EmptyState
        title="Customer records coming here"
        description="A searchable list of customers across ecommerce and Academy, with order history and lifetime spend."
      />
    </div>
  );
}
