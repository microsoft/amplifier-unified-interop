# Amplifier Unified Interoperability Checks

Independent protocol peers and checks for developers integrating Amplifier Unified
hosts, clients, and ACP agents. Use them to test public interfaces without importing
the component's private implementation.

The default fixtures use temporary state and synthetic agents. They do not need
provider credentials or make model calls.

## Get started

Install the dependencies from a checkout and point the harness at an independently
installed Unified Host executable:

```sh
npm ci
UNIFIED_HOST_COMMAND='["amplifier-unified-host"]' npm test
```

`UNIFIED_HOST_COMMAND` is a JSON argument array, not shell code. The harness supplies
its own private configuration and launches an independent ACP peer. If you omit the
variable, process checks are skipped; passing only the schema checks does not prove
the host works.

The core checks cover initialization, conversation state, streaming updates,
permissions, multiple viewers, reconnects, and duplicate-request handling.

## Run a more specific check

The [contract and check map](CONTRACT.v1.md) explains the additional inputs for
installed native readers, catalog scaling, client substitution, and recovery.
Use owned test state and independently installed candidate programs. Account-backed
vendor checks require separate credentials and authorization.

Keep results scoped to what actually ran: an echo agent cannot establish browser
usability, native-runtime behavior, or real-provider support.

## Reference

- [Check map and integration boundaries](CONTRACT.v1.md)
- [Protocol fixtures](test/)
- [AHP schema inputs](upstream/ahp/)

## Contributing

Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Contributor License Agreements](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
