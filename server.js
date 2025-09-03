const input = JSON.parse(inputData.jsonString);

// დავაბრუნებთ Array-ს
let out = [];

if (Array.isArray(input.images)) {
  for (let i = 0; i < input.images.length; i++) {
    out.push({
      IDX: i + 1,
      URL: input.images[i]
    });
  }
}

// Make-ს უნდა დავუბრუნოთ object, სადაც key არის "array"
return {
  array: out
};
