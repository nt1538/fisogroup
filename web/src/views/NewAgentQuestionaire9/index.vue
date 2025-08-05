<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-xl font-bold mb-4">Electronic Fund Transfers (EFT)</h1>
    <form @submit.prevent="submitForm">
      <div v-for="(field, key) in form" :key="key" class="mb-4">
        <label class="block font-semibold mb-1">{{ key }}</label>
        <input
          v-model="form[key]"
          type="text"
          class="w-full border border-gray-300 p-2 rounded"
          :placeholder="key"
        />
      </div>
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      form: {
        "Account Owner Name": "",
        "Transit/ABA #": "",
        "Account #": "",
        "Financial Institution Name": "",
        "Branch Address": "",
        "City": "",
        "State": "",
        "Zip": "",
        "Account Type": "",
        "Phone": "",
        "Signature": "",
        "Date": "",
      },
    };
  },
  methods: {
    async submitForm() {
      try {
        const res = await fetch("/api/submit-eft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form),
        });
        const result = await res.json();
        alert(result.message);
      } catch (e) {
        alert("Submission failed");
      }
    },
  },
};
</script>
