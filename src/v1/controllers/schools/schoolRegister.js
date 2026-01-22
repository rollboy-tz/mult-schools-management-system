// Should have:
export const registerSchool = async (req, res) => {
  console.log(req.body);
  // Registration logic
};

export const verifyFounderEmail = async (req, res) => {
  // Verification logic
};

// Optional default export
export default { registerSchool, verifyFounderEmail };