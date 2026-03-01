"""Custom exception hierarchy for ue-flow."""


class UEFlowError(Exception):
    """Base exception for all ue-flow errors."""


class ParseError(UEFlowError):
    """Raised when T3D paste text cannot be parsed."""


class RenderError(UEFlowError):
    """Raised when HTML/PNG rendering fails."""


class LayoutError(UEFlowError):
    """Raised when auto-layout encounters invalid graph structure."""


class SerializationError(UEFlowError):
    """Raised when graph serialization to JSON or T3D fails."""
