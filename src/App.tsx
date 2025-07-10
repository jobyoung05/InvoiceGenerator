import React, { useState, ChangeEvent } from "react";
import { PDFDocument } from "pdf-lib";
// @ts-ignore
import download from "downloadjs";

type FieldName =
  | "Date"
  | "Number"
  | "Name"
  | "Address1"
  | "Address2"
  | "Postcode"
  | "Email";

type FormData = Record<FieldName, string>;

type Service = {
  service: string;
  quantity: string;
  amount: string;
};

const App = () => {
  const [formData, setFormData] = useState<FormData>({
    Date: "",
    Number: "",
    Name: "",
    Address1: "",
    Address2: "",
    Postcode: "",
    Email: "",
  });

  const [services, setServices] = useState<Service[]>([
  { service: "", quantity: "", amount: "" },
  ]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((data) => ({ ...data, [name]: value }));
  };

  const handleServiceChange = (
    index: number,
    field: keyof Service,
    value: string
  ) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };

  const addService = () => {
    if (services.length < 4) {
      setServices([...services, { service: "", quantity: "", amount: "" }]);
    }
  };

  const removeService = (index: number) => {
    const updated = services.filter((_, i) => i !== index);
    setServices(updated);
  };

  const handleGeneratePDF = async () => {
    try {
      const existingPdfBytes = await fetch("/invoice_template.pdf").then((res) =>
        res.arrayBuffer()
      );

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // Fill basic fields
      (Object.keys(formData) as FieldName[]).forEach((fieldName) => {
        form.getTextField(fieldName).setText(formData[fieldName]);
      });

      // Fill service rows (S1–S4, Q1–Q4, A1–A4)
      services.forEach((item, i) => {
        const n = i + 1;
        // Strip leading £ if present
        const rawAmount = item.amount.startsWith("£") ? item.amount.slice(1) : item.amount;
        // Parse amount number
        const parsedAmount = parseFloat(rawAmount);
        // Save back with £ prefix (even if empty or invalid, show £)
        const displayAmount = isNaN(parsedAmount) ? "£" : `£${parsedAmount.toFixed(2)}`;

        form.getTextField(`S${n}`).setText(item.service);
        form.getTextField(`Q${n}`).setText(item.quantity);
        form.getTextField(`A${n}`).setText(displayAmount);

        // Update the amount in the service object for total calculation
        services[i].amount = rawAmount;
      });

      // Calculate total from cleaned amounts
      const totalAmount = services.reduce((sum, service) => {
        const val = parseFloat(service.amount);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      // Set total with £ prefix
      form.getTextField("Total").setText(`£${totalAmount.toFixed(2)}`);

      form.flatten();

      const pdfBytes = await pdfDoc.save();
      download(pdfBytes, "invoice.pdf", "application/pdf");
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Check the console.");
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Invoice Generator</h1>

      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow">
        {/* Main Info Form */}
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" autoComplete="off">
          {/* Date and Number side by side */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="Date">
              Date
            </label>
            <input
              id="Date"
              type="text"
              name="Date"
              placeholder="DD/MM/YYYY"
              value={formData.Date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="Number">
              Invoice Number
            </label>
            <input
              id="Number"
              type="text"
              name="Number"
              placeholder="e.g., INV-001"
              value={formData.Number}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {/* Full width for client name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1" htmlFor="Name">
              Client Name
            </label>
            <input
              id="Name"
              type="text"
              name="Name"
              placeholder="Full client name"
              value={formData.Name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {/* Address fields grouped */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="Address1">
              Address line 1
            </label>
            <input
              id="Address1"
              type="text"
              name="Address1"
              placeholder="Street address"
              value={formData.Address1}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="Address2">
              Address line 2
            </label>
            <input
              id="Address2"
              type="text"
              name="Address2"
              placeholder="Apartment, suite, etc. (optional)"
              value={formData.Address2}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {/* Postcode and Email side by side */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="Postcode">
              Postcode
            </label>
            <input
              id="Postcode"
              type="text"
              name="Postcode"
              placeholder="Postcode"
              value={formData.Postcode}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="Email">
              Email Address
            </label>
            <input
              id="Email"
              type="email"
              name="Email"
              placeholder="client@example.com"
              value={formData.Email}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </form>

        {/* Service Rows */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Optional Services</h2>
          {services.map((item, index) => (
            <div key={index} className="grid grid-cols-[2fr_1fr_1fr] gap-3 mb-2 items-end">
              <div>
                <label className="block text-sm mb-1">Service Name</label>
                <input
                  type="text"
                  value={item.service}
                  onChange={(e) =>
                    handleServiceChange(index, "service", e.target.value)
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Qty</label>
                <input
                  type="text"
                  value={item.quantity}
                  onChange={(e) =>
                    handleServiceChange(index, "quantity", e.target.value)
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Amount (£)</label>
                <input
                  type="text"
                  value={item.amount}
                  onChange={(e) =>
                    handleServiceChange(index, "amount", e.target.value)
                  }
                  className="w-full p-2 border rounded"
                />
              </div>

              <button
                onClick={() => removeService(index)}
                type="button"
                className="text-red-600 text-sm col-span-3 text-left mt-1"
              >
                Remove
              </button>
            </div>
          ))}

          {services.length < 4 && (
            <button
              onClick={addService}
              type="button"
              className="mt-2 text-blue-600 text-sm"
            >
              + Add Service
            </button>
          )}
        </div>

        <button
          onClick={handleGeneratePDF}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default App;
