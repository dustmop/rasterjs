const util = {
  renderCompareTo: function(ra, filename, success) {
    ra.show(null, ensureImageMatch(filename, success));
    ra.display._hasDocumentBody = true;
  }
};
